const { generateTestStudents } = require('../utils/testData');
const { initDatabase } = require('../models/database');
const { logger } = require('../utils/logger');

async function main() {
  try {
    // 初始化数据库连接
    await initDatabase();
    
    // 生成100条测试数据
    await generateTestStudents(100);
    
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}

main(); 