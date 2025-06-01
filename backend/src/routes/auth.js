const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get } = require('../models/database');
const { logger } = require('../utils/logger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    // 记录登录尝试
    logger.logOperation({
      type: 'login',
      module: 'auth',
      description: '用户登录尝试',
      username,
      details: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    if (!username || !password) {
      logger.warn('登录失败: 用户名或密码为空', {
        username,
        ip: req.ip
      });
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const [user] = await get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (user) {
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

        // 记录登录成功
        logger.logOperation({
          type: 'login',
          module: 'auth',
          description: '用户登录成功',
          username: user.username,
          status: 'success',
          details: {
            role: user.role,
            ip: req.ip,
            userAgent: req.headers['user-agent']
          }
        });
        

        return res.json(response);
      }
    }

    logger.logOperation({
      type: 'login',
      module: 'auth',
      description: `用户登录失败`,
      status: 'failure',  
      username: req.body.username,
      ip: req.ip,
      details: {
        username,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });
    // 记录登录失败
    logger.logOperation({
      type: 'login',
      module: 'auth',
      description: '用户登录失败',
      username,
      status: 'failure',
      details: {
        reason: '用户名或密码错误',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    return res.status(401).json({ message: '用户名或密码错误' });
  } catch (err) {
  

    logger.logOperation({
      type: 'login',
      module: 'auth',
      description: '登录过程发生错误',
      username: req.body.username,
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
    return res.status(401).json({ valid: false });
  }
});

module.exports = router; 