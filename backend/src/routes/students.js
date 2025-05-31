const express = require('express');
const multer = require('multer');
const path = require('path');
const { run, get } = require('../models/database');
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

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
  try {
    const { name, student_id, grade, class: className, address, emergency_contact, emergency_phone, notes } = req.body;
    const photo_url = req.file ? `/uploads/students/${req.file.filename}` : null;

    const result = await run(
      `INSERT INTO students (name, student_id, grade, class, photo_url, address, emergency_contact, emergency_phone, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, student_id, grade, className, photo_url, address, emergency_contact, emergency_phone, notes]
    );

    res.status(201).json({
      id: result.lastID,
      name,
      student_id,
      grade,
      class: className,
      photo_url,
      address,
      emergency_contact,
      emergency_phone,
      notes
    });
  } catch (err) {
    next(err);
  }
});

// 更新学生
router.put('/:id', authenticateToken, upload.single('photo'), async (req, res, next) => {
  try {
    const { name, student_id, grade, class: className, address, emergency_contact, emergency_phone, notes } = req.body;
    const photo_url = req.file ? `/uploads/students/${req.file.filename}` : undefined;

    let updateFields = [];
    let params = [];

    const fields = {
      name, student_id, grade, class: className, address, emergency_contact, emergency_phone, notes
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (photo_url) {
      updateFields.push('photo_url = ?');
      params.push(photo_url);
    }

    params.push(req.params.id);

    await run(
      `UPDATE students SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    const [updatedStudent] = await get('SELECT * FROM students WHERE id = ?', [req.params.id]);
    res.json(updatedStudent);
  } catch (err) {
    next(err);
  }
});

// 删除学生
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    await run('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router; 