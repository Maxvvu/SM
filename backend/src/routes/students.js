const express = require('express');
const multer = require('multer');
const path = require('path');
const ExcelJS = require('exceljs');
const { run, get } = require('../models/database');
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { createStudentTemplate } = require('../utils/excel');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/students'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'photo') {
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        return cb(null, true);
      }
      cb(new Error('只允许上传jpg/jpeg/png格式的图片！'));
    } else if (file.fieldname === 'file') {
      const allowedTypes = /xlsx|xls/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      if (extname) {
        return cb(null, true);
      }
      cb(new Error('只允许上传Excel文件！'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// 下载Excel导入模板
router.get('/template', authenticateToken, async (req, res, next) => {
  try {
    const workbook = await createStudentTemplate();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

// 获取所有学生
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const students = await get('SELECT * FROM students ORDER BY grade, class, name');
    res.json(students);
  } catch (err) {
    next(err);
  }
});

// 获取单个学生
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const [student] = await get('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) {
      return res.status(404).json({ message: '未找到该学生' });
    }
    res.json(student);
  } catch (err) {
    next(err);
  }
});

// 创建学生
router.post('/', authenticateToken, upload.single('photo'), async (req, res, next) => {
  console.log('----req.user----',req.user);
  console.log('----req.ip----',req.ip);
  console.log('----req.body----',req.body);
  try {
    const { name, student_id, grade, class: className, teacher, address, emergency_contact, emergency_phone, notes, photo_url, status } = req.body;

    // 验证年级
    if (!grade) {
      return res.status(400).json({ message: '年级不能为空' });
    }
    
    // 验证年级格式
    const validGrades = ['高一', '高二', '高三'];
    const yearGradePattern = /^\d{4}级$/;
    const yearPattern = /^\d{4}$/;
    
    if (!validGrades.includes(grade) && !yearGradePattern.test(grade) && !yearPattern.test(grade)) {
      return res.status(400).json({ message: '无效的年级格式' });
    }
    
    // 处理纯数字年份，添加"级"后缀
    let finalGrade = grade;
    if (yearPattern.test(grade)) {
      finalGrade = `${grade}级`;
    }
    
    // 如果是年份格式，验证年份范围
    if (yearGradePattern.test(finalGrade) || yearPattern.test(grade)) {
      const year = parseInt(yearPattern.test(grade) ? grade : finalGrade);
      const currentYear = new Date().getFullYear();
      if (year < currentYear - 5 || year > currentYear + 5) {
        return res.status(400).json({ message: '年级年份必须在合理范围内' });
      }
    }

    const result = await run(
      `INSERT INTO students (name, student_id, grade, class, teacher, photo_url, address, emergency_contact, emergency_phone, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, student_id, finalGrade, className, teacher, photo_url, address, emergency_contact, emergency_phone, notes, status || '正常']
    );

    // 获取新插入的学生数据
    const [newStudent] = await get('SELECT * FROM students WHERE id = ?', [result.lastID]);

    logger.logOperation({
      type: 'create',
      module: 'students',
      description: `创建学生: ${name}`,
      status: 'success',  
      username: req.user.username,
      ip: req.ip,
      details: {
        name,
        student_id,
        grade,
        class: className,
        teacher,
        photo_url,
        address,
        emergency_contact,
        emergency_phone,
        notes,
        status
      }
    });

    res.status(201).json(newStudent);
  } catch (err) {
    console.log('----err----',err);
    next(err);
  }
});

// 更新学生
router.put('/:id', authenticateToken, upload.single('photo'), async (req, res, next) => {
  try {
    console.log('收到更新请求:', {
      id: req.params.id,
      body: req.body,
      user: req.user
    });

    const { name, student_id, grade, class: className, teacher, address, emergency_contact, emergency_phone, notes, photo_url, status } = req.body;
    
    // 获取当前学生数据
    const [currentStudent] = await get('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!currentStudent) {
      console.log('未找到学生:', req.params.id);
      return res.status(404).json({ message: '未找到该学生' });
    }

    console.log('当前学生数据:', currentStudent);

    // 验证状态值
    const validStatus = ['正常', '警告', '严重警告', '记过', '留校察看', '勒令退学', '开除学籍'];
    if (status !== undefined && !validStatus.includes(status)) {
      console.log('无效的状态值:', status);
      return res.status(400).json({ 
        message: '无效的状态值',
        details: `状态必须是以下值之一：${validStatus.join('、')}`
      });
    }

    // 验证年级
    let finalGrade = grade;
    if (grade) {
      const validGrades = ['高一', '高二', '高三'];
      const yearGradePattern = /^\d{4}级$/;
      const yearPattern = /^\d{4}$/;
      
      // 如果是纯数字年份，添加"级"后缀
      if (yearPattern.test(grade)) {
        finalGrade = `${grade}级`;
      }
      
      // 验证年级格式
      if (!validGrades.includes(grade) && !yearGradePattern.test(grade) && !yearPattern.test(grade)) {
        console.log('无效的年级格式:', grade);
        return res.status(400).json({ message: '无效的年级格式' });
      }
      
      // 如果是年份格式，验证年份范围
      if (yearGradePattern.test(finalGrade) || yearPattern.test(grade)) {
        const year = parseInt(yearPattern.test(grade) ? grade : finalGrade);
        const currentYear = new Date().getFullYear();
        if (year < currentYear - 5 || year > currentYear + 5) {
          console.log('年级年份超出范围:', year);
          return res.status(400).json({ message: '年级年份必须在合理范围内' });
        }
      }
    }

    // 构建更新字段
    const fields = {};
    
    // 只包含已提供的字段
    if (name !== undefined) fields.name = name;
    if (student_id !== undefined) fields.student_id = student_id;
    if (grade !== undefined) fields.grade = finalGrade;
    if (className !== undefined) fields.class = className;
    if (teacher !== undefined) fields.teacher = teacher;
    if (photo_url !== undefined) fields.photo_url = photo_url;
    if (address !== undefined) fields.address = address;
    if (emergency_contact !== undefined) fields.emergency_contact = emergency_contact;
    if (emergency_phone !== undefined) fields.emergency_phone = emergency_phone;
    if (notes !== undefined) fields.notes = notes;
    if (status !== undefined) fields.status = status;

    console.log('更新字段:', fields);

    // 如果状态发生变化，记录日志
    if (fields.status !== undefined && fields.status !== currentStudent.status) {
      try {
        await logger.logOperation({
          type: 'update',
          module: 'students',
          description: `修改学生状态：${currentStudent.name}，从 ${currentStudent.status || '正常'} 变更为 ${fields.status}`,
          status: 'success',
          username: req.user.username,
          ip: req.ip,
          details: {
            student_id: currentStudent.id,
            student_name: currentStudent.name,
            old_status: currentStudent.status || '正常',
            new_status: fields.status
          }
        });
      } catch (logError) {
        console.error('记录状态变更日志失败:', logError);
        // 继续执行，不影响更新操作
      }
    }

    // 构建SQL更新语句
    const updates = [];
    const values = [];
    Object.entries(fields).forEach(([key, value]) => {
      updates.push(`${key === 'class' ? 'class' : key} = ?`);
      values.push(value);
    });

    console.log('SQL更新字段:', {
      updates,
      values,
      sql: `UPDATE students SET ${updates.join(', ')} WHERE id = ?`
    });

    // 如果没有要更新的字段，直接返回当前数据
    if (updates.length === 0) {
      console.log('没有需要更新的字段');
      return res.json(currentStudent);
    }

    // 添加ID到values数组
    values.push(req.params.id);

    try {
      // 执行更新
      const updateResult = await run(
        `UPDATE students SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      console.log('更新结果:', updateResult);

      // 获取更新后的数据
      const [updatedStudent] = await get('SELECT * FROM students WHERE id = ?', [req.params.id]);

      if (!updatedStudent) {
        console.error('更新后未找到学生数据');
        return res.status(500).json({ message: '更新后未能获取学生数据' });
      }

      console.log('更新成功:', updatedStudent);

      // 记录更新操作日志
      try {
        await logger.logOperation({
          type: 'update',
          module: 'students',
          description: `更新学生信息: ${updatedStudent.name}`,
          status: 'success',
          username: req.user.username,
          ip: req.ip,
          details: {
            student_id: updatedStudent.id,
            updated_fields: updates.map(u => u.split(' = ')[0])
          }
        });
      } catch (logError) {
        console.error('记录更新操作日志失败:', logError);
      }

      res.json(updatedStudent);
    } catch (dbError) {
      console.error('数据库更新失败:', {
        error: dbError,
        sql: `UPDATE students SET ${updates.join(', ')} WHERE id = ?`,
        values: values
      });
      
      // 检查是否是唯一约束违反
      if (dbError.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ 
          message: '学号已存在',
          details: '请使用其他学号'
        });
      }
      
      throw dbError;
    }
  } catch (err) {
    console.error('更新学生信息失败:', {
      error: err,
      stack: err.stack,
      request: {
        id: req.params.id,
        body: req.body
      }
    });
    
    // 返回适当的错误响应
    res.status(500).json({
      message: '更新学生信息失败',
      details: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
    });
  }
});

// 删除学生
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    // 检查学生是否存在
    const [student] = await get('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) {
      return res.status(404).json({ message: '未找到该学生' });
    }

    // 开始事务
    await run('BEGIN TRANSACTION');

    try {
      // 先删除该学生的所有行为记录
      await run('DELETE FROM behaviors WHERE student_id = ?', [req.params.id]);
      
      // 再删除学生记录
      const result = await run('DELETE FROM students WHERE id = ?', [req.params.id]);

      if (result.changes === 0) {
        await run('ROLLBACK');
        return res.status(404).json({ message: '删除失败：学生不存在' });
      }

      // 提交事务
      await run('COMMIT');

      // 记录操作日志（不在事务中处理）
      try {
        await logger.logOperation({
          type: 'delete',
          module: 'students',
          description: `删除学生: ${student.name}`,
          status: 'success',  
          username: req.user.username,
          details: {
            id: req.params.id,
            student_name: student.name,
            student_id: student.student_id
          }
        });
      } catch (logError) {
        console.error('记录删除操作日志失败:', logError);
        // 继续执行，不影响删除操作的结果
      }

      res.status(204).send();
    } catch (err) {
      // 如果出错，回滚事务
      await run('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('删除学生失败:', err);
    if (err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED') {
      return res.status(409).json({ message: '数据库忙，请稍后重试' });
    }
    next(err);
  }
});

// 导入学生
router.post('/import', authenticateToken, upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: '请上传Excel文件' });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.getWorksheet(1);
    
    const students = [];
    const errors = [];
    
    // 从第二行开始读取（跳过表头）
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头
      
      const student = {
        name: row.getCell(1).value,
        student_id: row.getCell(2).value,
        grade: row.getCell(3).value,
        class: row.getCell(4).value,
        teacher: row.getCell(5).value,
        status: row.getCell(6).value || '正常',
        address: row.getCell(7).value,
        emergency_contact: row.getCell(8).value,
        emergency_phone: row.getCell(9).value,
        notes: row.getCell(10).value
      };
      
      // 验证必填字段
      if (!student.name || !student.student_id || !student.grade || !student.class || !student.teacher) {
        errors.push(`第${rowNumber}行：姓名、学号、年级、班级、班主任为必填项`);
        return;
      }
      
      // 验证年级格式
      const validGrades = ['高一', '高二', '高三'];
      const yearGradePattern = /^\d{4}级$/;
      
      if (!validGrades.includes(student.grade) && !yearGradePattern.test(student.grade)) {
        errors.push(`第${rowNumber}行：年级格式必须为"YYYY级"，例如"2025级"`);
        return;
      }
      
      // 如果是年份格式，验证年份范围
      if (yearGradePattern.test(student.grade)) {
        const year = parseInt(student.grade);
        const currentYear = new Date().getFullYear();
        if (year < currentYear - 5 || year > currentYear + 5) {
          errors.push(`第${rowNumber}行：年级年份必须在合理范围内`);
          return;
        }
      }
      
      // 验证状态值
      const validStatus = ['正常', '警告', '严重警告', '记过', '留校察看', '勒令退学', '开除学籍'];
      if (student.status && !validStatus.includes(student.status)) {
        errors.push(`第${rowNumber}行：状态值无效，必须是以下值之一：${validStatus.join('、')}`);
        return;
      }
      
      students.push(student);
    });
    
    // 如果有错误，返回错误信息
    if (errors.length > 0) {
      return res.status(400).json({ 
        message: '导入数据有误',
        errors 
      });
    }
    
    // 开始导入数据
    for (const student of students) {
      try {
        // 检查学号是否已存在
        const [existingStudent] = await get('SELECT * FROM students WHERE student_id = ?', [student.student_id]);
        if (existingStudent) {
          errors.push(`学号${student.student_id}已存在`);
          continue;
        }
        
        await run(
          `INSERT INTO students (name, student_id, grade, class, teacher, status, address, emergency_contact, emergency_phone, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [student.name, student.student_id, student.grade, student.class, student.teacher, student.status, student.address, student.emergency_contact, student.emergency_phone, student.notes]
        );
        
        // 记录操作日志
        await logger.logOperation({
          type: 'create',
          module: 'students',
          description: `导入学生: ${student.name}`,
          username: req.user.username,
          ip: req.ip,
          details: student
        });
      } catch (err) {
        errors.push(`导入学生${student.name}（${student.student_id}）失败: ${err.message}`);
      }
    }
    
    res.json({
      message: '导入完成',
      total: students.length,
      success: students.length - errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    next(err);
  }
});

// 批量删除学生
router.post('/batch-delete', authenticateToken, async (req, res, next) => {
  const { ids } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: '请选择要删除的学生' });
  }

  try {
    // 开始事务
    await run('BEGIN TRANSACTION');

    try {
      // 获取要删除的学生信息（用于日志记录）
      const students = await get(
        'SELECT id, name, student_id FROM students WHERE id IN (' + ids.map(() => '?').join(',') + ')',
        ids
      );

      if (students.length === 0) {
        await run('ROLLBACK');
        return res.status(404).json({ message: '未找到要删除的学生' });
      }

      // 先删除这些学生的所有行为记录
      await run(
        'DELETE FROM behaviors WHERE student_id IN (' + ids.map(() => '?').join(',') + ')',
        ids
      );

      // 再删除学生记录
      const result = await run(
        'DELETE FROM students WHERE id IN (' + ids.map(() => '?').join(',') + ')',
        ids
      );

      // 提交事务
      await run('COMMIT');

      // 记录操作日志
      try {
        for (const student of students) {
          await logger.logOperation({
            type: 'delete',
            module: 'students',
            description: `批量删除学生: ${student.name}`,
            status: 'success',
            username: req.user.username,
            details: {
              id: student.id,
              student_name: student.name,
              student_id: student.student_id
            }
          });
        }
      } catch (logError) {
        console.error('记录批量删除操作日志失败:', logError);
        // 继续执行，不影响删除操作的结果
      }

      res.json({
        message: '批量删除成功',
        deletedCount: result.changes,
        details: {
          total: ids.length,
          success: result.changes,
          studentNames: students.map(s => s.name)
        }
      });
    } catch (err) {
      // 如果出错，回滚事务
      await run('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('批量删除学生失败:', err);
    if (err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED') {
      return res.status(409).json({ message: '数据库忙，请稍后重试' });
    }
    next(err);
  }
});

module.exports = router; 