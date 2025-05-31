const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Token验证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.error('Token验证失败:', err);
      return res.status(403).json({ message: '无效的认证令牌' });
    }

    req.user = user;
    next();
  });
};

// 管理员权限检查中间件
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn('非管理员用户尝试访问管理员资源:', req.user);
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
};

module.exports = {
  authenticateToken,
  isAdmin
}; 