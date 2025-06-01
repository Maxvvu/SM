const express = require('express');
const bcrypt = require('bcryptjs');
const { run, get } = require('../models/database');
const { logger } = require('../utils/logger');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取用户列表（需要管理员权限）
router.get('/', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    console.log('开始获取用户列表...');
    
    const users = await get(`
      SELECT 
        id, 
        username, 
        role,
        CASE WHEN status = 0 THEN 'inactive' ELSE 'active' END as status,
        last_login as lastLogin
      FROM users
      ORDER BY username
    `);

    console.log('原始用户数据:', users);

    // 格式化日期
    const formattedUsers = users.map(user => {
      console.log('处理用户数据:', user.username, '最后登录时间:', user.lastLogin);
      return {
        ...user,
        lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString() : null
      };
    });

    console.log('格式化后的用户数据:', formattedUsers);
    res.json(formattedUsers);
  } catch (err) {
    console.error('获取用户列表失败:', err);
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

// 修改密码
router.post('/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const username = req.user.username;

    // 获取用户信息
    const [user] = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证旧密码
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: '原密码错误' });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await run('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username]);

    // 记录密码修改操作
    logger.logOperation({
      type: 'update',
      module: 'users',
      description: '修改密码',
      username: username,
      status: 'success',
      details: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({ message: '密码修改成功' });
  } catch (err) {
    // 记录错误
    logger.logOperation({
      type: 'update',
      module: 'users',
      description: '修改密码失败',
      username: req.user.username,
      status: 'error',
      details: {
        error: err.message,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });
    next(err);
  }
});

module.exports = router; 