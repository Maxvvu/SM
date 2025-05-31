const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

const JWT_SECRET = 'your-secret-key';  // 在生产环境中使用更安全的密钥

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('未提供认证token');
    return res.status(401).json({ message: '未提供认证token' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('无效的token:', err);
      return res.status(403).json({ message: '无效的token' });
    }

    req.user = user;
    next();
  });
}

module.exports = { authenticateToken }; 