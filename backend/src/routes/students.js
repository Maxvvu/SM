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
    const { name, student_id, grade, class: className, teacher, address, emergency_contact, emergency_phone, notes, photo_url } = req.body;

    const result = await run(
      `INSERT INTO students (name, student_id, grade, class, teacher, photo_url, address, emergency_contact, emergency_phone, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, student_id, grade, className, teacher, photo_url, address, emergency_contact, emergency_phone, notes]
    );

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
        notes
      }
    });

    res.status(201).json({
      id: result.lastID,
      name,
      student_id,
      grade,
      class: className,
      teacher,
      photo_url,
      address,
      emergency_contact,
      emergency_phone,
      notes
    });
  } catch (err) {
    console.log('----err----',err);
    next(err);
  }
});

// 更新学生
router.put('/:id', authenticateToken, upload.single('photo'), async (req, res, next) => {
  try {
    const { name, student_id, grade, class: className, teacher, address, emergency_contact, emergency_phone, notes, photo_url } = req.body;
    
    // 获取当前学生数据
    const [currentStudent] = await get('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!currentStudent) {
      return res.status(404).json({ message: '未找到该学生' });
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    const fields = {
      name, student_id, grade, class: className, teacher, photo_url,
      address, emergency_contact, emergency_phone, notes
    };

    // 只更新提供的字段
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key === 'class' ? 'class' : key} = ?`);
        values.push(value);
      }
    });

    // 如果没有要更新的字段，直接返回当前数据
    if (updates.length === 0) {
      return res.json(currentStudent);
    }

    // 添加ID到values数组
    values.push(req.params.id);

    // 执行更新
    await run(
      `UPDATE students SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // 获取更新后的数据
    const [updatedStudent] = await get('SELECT * FROM students WHERE id = ?', [req.params.id]);

    logger.logOperation({
      type: 'update',
      module: 'students',
      description: `更新学生信息`,
      status: 'success',
      username: req.user.username,
      ip: req.ip,
      details: {
        id: req.params.id,
        updatedFields: Object.keys(fields).filter(key => fields[key] !== undefined)
      }
    });

    res.json(updatedStudent);
  } catch (err) {
    next(err);
  }
});

// 删除学生
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    // 开始事务
    await run('BEGIN TRANSACTION');

    try {
      // 先删除该学生的所有行为记录
      await run('DELETE FROM behaviors WHERE student_id = ?', [req.params.id]);
      
      // 再删除学生记录
      await run('DELETE FROM students WHERE id = ?', [req.params.id]);

      // 提交事务
      await run('COMMIT');

      logger.logOperation({
        type: 'delete',
        module: 'students',
        description: `删除学生`,
        status: 'success',  
        username: req.user.username,
        ip: req.ip,
        details: {
          id: req.params.id,
        }
      });

      res.status(204).send();
    } catch (err) {
      // 如果出错，回滚事务
      await run('ROLLBACK');
      throw err;
    }
  } catch (err) {
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
        address: row.getCell(6).value,
        emergency_contact: row.getCell(7).value,
        emergency_phone: row.getCell(8).value,
        notes: row.getCell(9).value
      };
      
      // 验证必填字段
      if (!student.name || !student.student_id || !student.grade || !student.class || !student.teacher) {
        errors.push(`第${rowNumber}行：姓名、学号、年级、班级、班主任为必填项`);
        return;
      }
      
      // 验证年级格式
      const gradePattern = /^\d{4}级$/;
      if (!gradePattern.test(student.grade)) {
        errors.push(`第${rowNumber}行：年级格式必须为"YYYY级"，例如"2025级"`);
        return;
      }
      
      // 验证年级范围
      const gradeYear = parseInt(student.grade);
      const currentYear = new Date().getFullYear();
      if (gradeYear < currentYear || gradeYear > currentYear + 3) {
        errors.push(`第${rowNumber}行：年级必须在当前年份到未来3年之间`);
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
          `INSERT INTO students (name, student_id, grade, class, teacher, address, emergency_contact, emergency_phone, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [student.name, student.student_id, student.grade, student.class, student.teacher, student.address, student.emergency_contact, student.emergency_phone, student.notes]
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

module.exports = router; 