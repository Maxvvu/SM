const express = require('express');
const { run, get } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// 获取所有行为类型
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const types = await get('SELECT * FROM behavior_types ORDER BY category, name');
    res.json(types);
  } catch (err) {
    next(err);
  }
});

// 获取单个行为类型
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const [type] = await get('SELECT * FROM behavior_types WHERE id = ?', [req.params.id]);
    if (!type) {
      return res.status(404).json({ message: '未找到该行为类型' });
    }
    res.json(type);
  } catch (err) {
    next(err);
  }
});

// 创建行为类型
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { name, category, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: '名称和类别不能为空' });
    }

    const result = await run(
      'INSERT INTO behavior_types (name, category, description) VALUES (?, ?, ?)',
      [name, category, description]
    );

    res.status(201).json({
      id: result.lastID,
      name,
      category,
      description
    });
  } catch (err) {
    next(err);
  }
});

// 更新行为类型
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { name, category, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: '名称和类别不能为空' });
    }

    await run(
      'UPDATE behavior_types SET name = ?, category = ?, description = ? WHERE id = ?',
      [name, category, description, req.params.id]
    );

    const [updatedType] = await get('SELECT * FROM behavior_types WHERE id = ?', [req.params.id]);
    res.json(updatedType);
  } catch (err) {
    next(err);
  }
});

// 删除行为类型
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    await run('DELETE FROM behavior_types WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router; 