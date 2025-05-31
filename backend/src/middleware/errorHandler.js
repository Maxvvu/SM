const { logger } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('错误:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      message: '未授权访问'
    });
  }

  return res.status(500).json({
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

module.exports = { errorHandler }; 