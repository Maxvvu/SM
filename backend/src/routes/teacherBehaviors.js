const express = require('express');
const router = express.Router();
const { get, run } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// 获取所有教师行为记录
router.get('/', authenticateToken, async (req, res) => {
  try {
    const behaviors = await get('SELECT * FROM teacher_behaviors ORDER BY date DESC');
    res.json(behaviors);
  } catch (error) {
    console.error('获取教师行为记录失败:', error);
    await logger.logOperation({
      type: 'ERROR',
      module: 'teacher-behaviors',
      description: '获取教师行为记录失败',
      username: req.user.username,
      status: 'error',
      details: { error: error.message }
    });
    res.status(500).json({ message: '获取教师行为记录失败' });
  }
});

// 添加教师行为记录
router.post('/', authenticateToken, async (req, res) => {
  const { teacher_name, behavior_type, description, date, process_result, score } = req.body;

  if (!teacher_name || !behavior_type || !description || !date) {
    return res.status(400).json({ message: '教师姓名、行为类型、描述和时间为必填项' });
  }

  try {
    const result = await run(
      `INSERT INTO teacher_behaviors (teacher_name, behavior_type, description, date, process_result, score) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [teacher_name, behavior_type, description, date, process_result, score || 0]
    );

    const [newBehavior] = await get('SELECT * FROM teacher_behaviors WHERE id = ?', [result.lastID]);

    await logger.logOperation({
      type: 'CREATE',
      module: 'teacher-behaviors',
      description: '添加教师行为记录成功',
      username: req.user.username,
      status: 'success',
      details: { behavior: { teacher_name, behavior_type, description, score } }
    });

    res.status(201).json(newBehavior);
  } catch (error) {
    console.error('添加教师行为记录失败:', error);
    await logger.logOperation({
      type: 'ERROR',
      module: 'teacher-behaviors',
      description: '添加教师行为记录失败',
      username: req.user.username,
      status: 'error',
      details: { error: error.message, behavior: { teacher_name, behavior_type, description, score } }
    });
    res.status(500).json({ message: '添加教师行为记录失败' });
  }
});

// 更新教师行为记录
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { teacher_name, behavior_type, description, date, process_result, score } = req.body;

  if (!teacher_name || !behavior_type || !description || !date) {
    return res.status(400).json({ message: '教师姓名、行为类型、描述和时间为必填项' });
  }

  try {
    await run(
      `UPDATE teacher_behaviors 
       SET teacher_name = ?, behavior_type = ?, description = ?, 
           date = ?, process_result = ?, score = ?,
           updated_at = datetime(CURRENT_TIMESTAMP,'localtime')
       WHERE id = ?`,
      [teacher_name, behavior_type, description, date, process_result, score || 0, id]
    );

    const [updatedBehavior] = await get('SELECT * FROM teacher_behaviors WHERE id = ?', [id]);

    if (!updatedBehavior) {
      return res.status(404).json({ message: '行为记录不存在' });
    }

    await logger.logOperation({
      type: 'UPDATE',
      module: 'teacher-behaviors',
      description: '更新教师行为记录成功',
      username: req.user.username,
      status: 'success',
      details: { behavior: { id, teacher_name, behavior_type, description, score } }
    });

    res.json(updatedBehavior);
  } catch (error) {
    console.error('更新教师行为记录失败:', error);
    await logger.logOperation({
      type: 'ERROR',
      module: 'teacher-behaviors',
      description: '更新教师行为记录失败',
      username: req.user.username,
      status: 'error',
      details: { error: error.message, behavior: { id, teacher_name, behavior_type, description, score } }
    });
    res.status(500).json({ message: '更新教师行为记录失败' });
  }
});

// 删除教师行为记录
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [behaviorToDelete] = await get('SELECT * FROM teacher_behaviors WHERE id = ?', [id]);

    if (!behaviorToDelete) {
      return res.status(404).json({ message: '行为记录不存在' });
    }

    await run('DELETE FROM teacher_behaviors WHERE id = ?', [id]);

    await logger.logOperation({
      type: 'DELETE',
      module: 'teacher-behaviors',
      description: '删除教师行为记录成功',
      username: req.user.username,
      status: 'success',
      details: { behavior: behaviorToDelete }
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除教师行为记录失败:', error);
    await logger.logOperation({
      type: 'ERROR',
      module: 'teacher-behaviors',
      description: '删除教师行为记录失败',
      username: req.user.username,
      status: 'error',
      details: { error: error.message, behaviorId: id }
    });
    res.status(500).json({ message: '删除教师行为记录失败' });
  }
});

module.exports = router; 