const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

function ensureUploadDirectories() {
  const uploadTypes = ['general', 'students', 'behaviors'];
  const baseUploadPath = path.join(__dirname, '../../uploads');

  // 确保基础上传目录存在
  if (!fs.existsSync(baseUploadPath)) {
    fs.mkdirSync(baseUploadPath, { recursive: true, mode: 0o755 });
    logger.info(`创建基础上传目录: ${baseUploadPath}`);
  }

  // 确保各类型上传目录存在
  uploadTypes.forEach(type => {
    const typePath = path.join(baseUploadPath, type);
    if (!fs.existsSync(typePath)) {
      fs.mkdirSync(typePath, { recursive: true, mode: 0o755 });
      logger.info(`创建上传目录: ${typePath}`);
    }
  });
}

module.exports = {
  ensureUploadDirectories
}; 