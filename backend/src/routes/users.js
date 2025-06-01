const express = require('express');
const bcrypt = require('bcryptjs');
const { run, get } = require('../models/database');
const { logger } = require('../utils/logger');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取用户列表（需要管理员权限）
router.get('/', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const users = await get(`
      SELECT 
        id, 
        username, 
        role,
        CASE WHEN status = 0 THEN 'inactive' ELSE 'active' END as status,
        datetime(last_login, 'localtime') as lastLogin
      FROM users
      ORDER BY username
    `);
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// 创建用户（需要管理员权限）
router.post('/', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    
    // 检查用户名是否已存在
    const [existingUser] = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const result = await run(
      'INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, 1)',
      [username, hashedPassword, role]
    );

    res.status(201).json({ 
      id: result.lastID,
      username,
      role,
      status: 'active'
    });
  } catch (err) {
    next(err);
  }
});

// 更新用户（需要管理员权限）
router.put('/:id', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, role } = req.body;

    // 检查用户是否存在
    const [user] = await get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 如果更改用户名，检查新用户名是否已存在
    if (username !== user.username) {
      const [existingUser] = await get('SELECT * FROM users WHERE username = ? AND id != ?', [username, id]);
      if (existingUser) {
        return res.status(400).json({ message: '用户名已存在' });
      }
    }

    await run(
      'UPDATE users SET username = ?, role = ? WHERE id = ?',
      [username, role, id]
    );

    res.json({
      id: parseInt(id),
      username,
      role,
      status: user.status === 0 ? 'inactive' : 'active'
    });
  } catch (err) {
    next(err);
  }
});

// 更新用户状态（需要管理员权限）
router.patch('/:id/status', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // 检查用户是否存在
    const [user] = await get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 不允许禁用管理员账户
    if (user.role === 'admin' && status === 'inactive') {
      return res.status(403).json({ message: '不能禁用管理员账户' });
    }

    const statusValue = status === 'active' ? 1 : 0;
    await run(
      'UPDATE users SET status = ? WHERE id = ?',
      [statusValue, id]
    );

    res.json({
      id: parseInt(id),
      username: user.username,
      role: user.role,
      status
    });
  } catch (err) {
    next(err);
  }
});

// 删除用户（需要管理员权限）
router.delete('/:id', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查用户是否存在
    const [user] = await get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 不允许删除管理员账户
    if (user.role === 'admin') {
      return res.status(403).json({ message: '不能删除管理员账户' });
    }

    await run('DELETE FROM users WHERE id = ?', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router; 