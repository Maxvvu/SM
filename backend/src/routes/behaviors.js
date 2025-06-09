const express = require('express');
const multer = require('multer');
const path = require('path');
const { run, get } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/behaviors'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('只允许上传jpg/jpeg/png格式的图片！'));
  }
});

// 获取行为统计
router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    const { start_date, end_date, type } = req.query;
    
    let query = `
      SELECT COUNT(*) as count
      FROM behaviors b
      JOIN behavior_types bt ON b.behavior_type = bt.name
      WHERE 1=1
    `;
    const params = [];

    if (type === 'violation') {
      query += ' AND bt.category = ?';
      params.push('违纪');
    } else if (type === 'excellent') {
      query += ' AND bt.category = ?';
      params.push('优秀');
    }

    if (start_date) {
      query += ' AND b.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND b.date <= ?';
      params.push(end_date);
    }

    const [result] = await get(query, params);
    res.json({ count: result.count });
  } catch (err) {
    next(err);
  }
});

// 获取所有行为记录
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { student_id, behavior_type, start_date, end_date } = req.query;
    let query = `
      SELECT b.*, s.name as student_name, s.grade, s.class, s.status as student_status,
             bt.score as behavior_score, bt.category as behavior_category
      FROM behaviors b
      JOIN students s ON b.student_id = s.id
      JOIN behavior_types bt ON b.behavior_type = bt.name
      WHERE 1=1
    `;
    const params = [];

    if (student_id) {
      query += ' AND b.student_id = ?';
      params.push(student_id);
    }
    if (behavior_type) {
      query += ' AND b.behavior_type = ?';
      params.push(behavior_type);
    }
    if (start_date) {
      query += ' AND b.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND b.date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY b.date DESC';
    const behaviors = await get(query, params);
    res.json(behaviors);
  } catch (err) {
    next(err);
  }
});

// 获取单个行为记录
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const [behavior] = await get(
      `SELECT b.*, s.name as student_name, s.grade, s.class, s.status as student_status,
              bt.score as behavior_score, bt.category as behavior_category
       FROM behaviors b
       JOIN students s ON b.student_id = s.id
       JOIN behavior_types bt ON b.behavior_type = bt.name
       WHERE b.id = ?`,
      [req.params.id]
    );
    
    if (!behavior) {
      return res.status(404).json({ message: '未找到该行为记录' });
    }
    res.json(behavior);
  } catch (err) {
    next(err);
  }
});

// 创建行为记录
router.post('/', authenticateToken, upload.single('image'), async (req, res, next) => {
  try {
    const { student_id, behavior_type, description, image_url, date, process_result } = req.body;
    
    // 验证行为类型是否存在
    const [type] = await get('SELECT * FROM behavior_types WHERE name = ?', [behavior_type]);
    if (!type) {
      return res.status(400).json({ message: '无效的行为类型' });
    }
    logger.logOperation({
      type: 'create',
      module: 'behaviors',
      description: `创建行为记录`,
      status: 'success',  
      username: req.user.username,
      ip: req.ip,
      details: {
        student_id,
        behavior_type,
        description,
        image_url,
        date,
        process_result
      }
    });
    // 验证学生是否存在
    const [student] = await get('SELECT * FROM students WHERE id = ?', [student_id]);
    if (!student) {
      return res.status(400).json({ message: '无效的学生ID' });
    }

    const result = await run(
      `INSERT INTO behaviors (student_id, behavior_type, description, date, image_url, process_result)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [student_id, behavior_type, description, date, image_url, process_result]
    );

    const [newBehavior] = await get(
      `SELECT b.*, s.name as student_name, s.grade, s.class, s.status as student_status
       FROM behaviors b
       JOIN students s ON b.student_id = s.id
       WHERE b.id = ?`,
      [result.lastID]
    );

    res.status(201).json(newBehavior);
  } catch (err) {
    next(err);
  }
});

// 更新行为记录
router.put('/:id', authenticateToken, upload.single('image'), async (req, res, next) => {
  try {
    console.log('收到更新请求:', req.params.id, req.body);

    // 检查记录是否存在
    const [existingBehavior] = await get('SELECT * FROM behaviors WHERE id = ?', [req.params.id]);
    if (!existingBehavior) {
      return res.status(404).json({ message: '未找到该行为记录' });
    }

    const { student_id, behavior_type, description, image_url, date, process_result } = req.body;

    // 如果提供了student_id，验证学生是否存在
    if (student_id) {
      const [student] = await get('SELECT * FROM students WHERE id = ?', [student_id]);
      if (!student) {
        return res.status(400).json({ message: '无效的学生ID' });
      }
    }

    // 如果提供了behavior_type，验证行为类型是否存在
    if (behavior_type) {
      const [type] = await get('SELECT * FROM behavior_types WHERE name = ?', [behavior_type]);
      if (!type) {
        return res.status(400).json({ message: '无效的行为类型' });
      }
    }

    // 构建更新语句
    const updates = [];
    const params = [];

    if (student_id) {
      updates.push('student_id = ?');
      params.push(student_id);
    }
    if (behavior_type) {
      updates.push('behavior_type = ?');
      params.push(behavior_type);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (date) {
      updates.push('date = ?');
      params.push(date);
    }
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      params.push(image_url);
    }
    if (process_result !== undefined) {
      updates.push('process_result = ?');
      params.push(process_result);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: '没有需要更新的字段' });
    }

    // 添加ID到参数数组
    params.push(req.params.id);

    console.log('执行更新SQL:', `UPDATE behaviors SET ${updates.join(', ')} WHERE id = ?`);
    console.log('更新参数:', params);

    // 执行更新
    await run(
      `UPDATE behaviors SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // 获取更新后的完整记录
    const [updatedBehavior] = await get(
      `SELECT b.*, s.name as student_name, s.grade, s.class, s.status as student_status,
              bt.score as behavior_score, bt.category as behavior_category
       FROM behaviors b
       JOIN students s ON b.student_id = s.id
       JOIN behavior_types bt ON b.behavior_type = bt.name
       WHERE b.id = ?`,
      [req.params.id]
    );

    if (!updatedBehavior) {
      return res.status(404).json({ message: '未找到更新后的记录' });
    }

    // 记录操作日志
    logger.logOperation({
      type: 'update',
      module: 'behaviors',
      description: `更新行为记录`,
      status: 'success',
      username: req.user.username,
      ip: req.ip,
      details: {
        id: req.params.id,
        updates: req.body
      }
    });

    console.log('更新成功，返回更新后的记录:', updatedBehavior);
    res.json(updatedBehavior);
  } catch (err) {
    console.error('更新行为记录失败:', err);
    next(err);
  }
});

// 删除行为记录
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    await run('DELETE FROM behaviors WHERE id = ?', [req.params.id]);
    logger.logOperation({
      type: 'delete',
      module: 'behaviors',
      description: `删除行为记录`,
      status: 'success',  
      username: req.user.username,
      ip: req.ip,
      details: {
        id: req.params.id,
      }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});


module.exports = router; 