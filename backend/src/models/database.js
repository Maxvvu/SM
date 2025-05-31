const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

const dbPath = path.join(__dirname, '../../database.sqlite');
let db;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('数据库连接失败:', err);
        throw err;
      }
    });
    db.run('PRAGMA foreign_keys = ON');
  }
  return db;
}

async function initDatabase() {
  const db = getDatabase();
  
  try {
    // 创建users表
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
      )
    `);
    logger.info('users表创建成功');

    // 创建students表
    await run(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        student_id TEXT UNIQUE NOT NULL,
        grade TEXT NOT NULL,
        class TEXT,
        photo_url TEXT,
        address TEXT,
        emergency_contact TEXT,
        emergency_phone TEXT,
        notes TEXT
      )
    `);
    logger.info('students表创建成功');

    // 创建behavior_types表
    await run(`
      CREATE TABLE IF NOT EXISTS behavior_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        description TEXT
      )
    `);
    logger.info('behavior_types表创建成功');

    // 创建behaviors表
    await run(`
      CREATE TABLE IF NOT EXISTS behaviors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        behavior_type TEXT NOT NULL,
        description TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        image_url TEXT,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (behavior_type) REFERENCES behavior_types (name)
      )
    `);
    logger.info('behaviors表创建成功');

    // 检查是否需要插入测试数据
    const [userCount] = await get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      logger.info('插入测试用户数据...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin']
      );

      // 插入测试学生数据
      const testStudents = [
        ['张三', 'S001', '高一', '1班', null, '北京市海淀区', '张父', '13800138000', '品学兼优'],
        ['李四', 'S002', '高二', '2班', null, '北京市朝阳区', '李母', '13900139000', '积极向上'],
        ['王五', 'S003', '高三', '3班', null, '北京市西城区', '王父', '13700137000', '认真负责']
      ];

      for (const student of testStudents) {
        await run(`
          INSERT INTO students (name, student_id, grade, class, photo_url, address, emergency_contact, emergency_phone, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, student);
      }

      // 插入测试行为类型数据
      const testTypes = [
        ['迟到', '违纪', '上课迟到'],
        ['早退', '违纪', '未经许可提前离开'],
        ['打架', '违纪', '与他人发生肢体冲突'],
        ['帮助同学', '优秀', '主动帮助有困难的同学'],
        ['志愿服务', '优秀', '参与学校志愿服务活动'],
        ['获奖', '优秀', '在比赛或竞赛中获奖']
      ];

      for (const type of testTypes) {
        await run(`
          INSERT INTO behavior_types (name, category, description)
          VALUES (?, ?, ?)
        `, type);
      }

      logger.info('测试数据插入完成');
    }
  } catch (err) {
    logger.error('数据库初始化失败:', err);
    throw err;
  }
}

// 工具函数：将db.run转换为Promise
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// 工具函数：将db.get转换为Promise
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  getDatabase,
  initDatabase,
  run,
  get
}; 