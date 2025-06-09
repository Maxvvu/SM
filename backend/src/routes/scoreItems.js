const express = require('express');
const router = express.Router();
const { get, run } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// 获取所有加减分项
router.get('/', authenticateToken, async (req, res) => {
  try {
    const scoreItems = await get('SELECT * FROM score_items ORDER BY category DESC, score DESC');
    res.json(scoreItems);
  } catch (error) {
    console.error('获取加减分项列表失败:', error);
    await logger.logOperation({
      type: 'ERROR',
      module: 'score-items',
      description: '获取加减分项列表失败',
      username: req.user.username,
      status: 'error',
      details: { error: error.message }
    });
    res.status(500).json({ message: '获取加减分项列表失败' });
  }
});

// 添加新的加减分项
router.post('/', authenticateToken, async (req, res) => {
  const { name, category, score, description } = req.body;

  if (!name || !category || score === undefined) {
    return res.status(400).json({ message: '名称、类别和分数为必填项' });
  }

  if (!['加分', '减分'].includes(category)) {
    return res.status(400).json({ message: '类别必须为"加分"或"减分"' });
  }

  try {
    const result = await run(
      'INSERT INTO score_items (name, category, score, description) VALUES (?, ?, ?, ?)',
      [name, category, score, description]
    );

    const [newItem] = await get('SELECT * FROM score_items WHERE id = ?', [result.lastID]);
    
    await logger.logOperation({
      type: 'CREATE',
      module: 'score-items',
      description: '添加加减分项成功',
      username: req.user.username,
      status: 'success',
      details: { scoreItem: { name, category, score } }
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('添加加减分项失败:', error);
    await logger.logOperation({
      type: 'ERROR',
      module: 'score-items',
      description: '添加加减分项失败',
      username: req.user.username,
      status: 'error',
      details: { error: error.message, scoreItem: { name, category, score } }
    });
    res.status(500).json({ message: '添加加减分项失败' });
  }
});

// 更新加减分项
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, category, score, description } = req.body;

  if (!name || !category || score === undefined) {
    return res.status(400).json({ message: '名称、类别和分数为必填项' });
  }

  if (!['加分', '减分'].includes(category)) {
    return res.status(400).json({ message: '类别必须为"加分"或"减分"' });
  }

  try {
    await run(
      `UPDATE score_items 
       SET name = ?, category = ?, score = ?, description = ?, 
           updated_at = datetime(CURRENT_TIMESTAMP,'localtime')
       WHERE id = ?`,
      [name, category, score, description, id]
    );

    const [updatedItem] = await get('SELECT * FROM score_items WHERE id = ?', [id]);
    
    if (!updatedItem) {
      return res.status(404).json({ message: '加减分项不存在' });
    }

    await logger.logOperation({
      type: 'UPDATE',
      module: 'score-items',
      description: '更新加减分项成功',
      username: req.user.username,
      status: 'success',
      details: { scoreItem: { id, name, category, score } }
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('更新加减分项失败:', error);
    await logger.logOperation({
      type: 'ERROR',
      module: 'score-items',
      description: '更新加减分项失败',
      username: req.user.username,
      status: 'error',
      details: { error: error.message, scoreItem: { id, name, category, score } }
    });
    res.status(500).json({ message: '更新加减分项失败' });
  }
});

// 删除加减分项
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [itemToDelete] = await get('SELECT * FROM score_items WHERE id = ?', [id]);
    
    if (!itemToDelete) {
      return res.status(404).json({ message: '加减分项不存在' });
    }

    await run('DELETE FROM score_items WHERE id = ?', [id]);

    await logger.logOperation({
      type: 'DELETE',
      module: 'score-items',
      description: '删除加减分项成功',
      username: req.user.username,
      status: 'success',
      details: { scoreItem: itemToDelete }
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除加减分项失败:', error);
    await logger.logOperation({
      type: 'ERROR',
      module: 'score-items',
      description: '删除加减分项失败',
      username: req.user.username,
      status: 'error',
      details: { error: error.message, scoreItemId: id }
    });
    res.status(500).json({ message: '删除加减分项失败' });
  }
});

module.exports = router; 