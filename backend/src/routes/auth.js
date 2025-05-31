const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get } = require('../models/database');
const { logger } = require('../utils/logger');

const router = express.Router();
const JWT_SECRET = 'your-secret-key';  // 在生产环境中使用更安全的密钥

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    logger.info('收到登录请求:', { username });

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const [user] = await get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (user) {
      logger.info('找到用户:', { username: user.username, role: user.role });
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (isValidPassword) {
        const token = jwt.sign(
          { username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        const response = {
          token,
          userInfo: {
            username: user.username,
            role: user.role
          }
        };

        logger.info('登录成功:', { username: user.username });
        return res.json(response);
      }
    }

    logger.warn('登录失败:', { username });
    return res.status(401).json({ message: '用户名或密码错误' });
  } catch (err) {
    logger.error('登录错误:', err);
    next(err);
  }
});

router.get('/verify-token', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ valid: false });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const [user] = await get('SELECT username, role FROM users WHERE username = ?', [decoded.username]);

    if (user) {
      return res.json({
        valid: true,
        userInfo: {
          username: user.username,
          role: user.role
        }
      });
    }

    return res.status(401).json({ valid: false });
  } catch (err) {
    logger.error('Token验证错误:', err);
    return res.status(401).json({ valid: false });
  }
});

module.exports = router; 