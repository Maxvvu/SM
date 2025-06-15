const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

// 修改数据库路径
const dbPath = path.join(__dirname, '../../database.sqlite');

let db;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
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
        role TEXT NOT NULL,
        status INTEGER DEFAULT 1,
        last_login TIMESTAMP
      )
    `);

    // 创建operation_logs表
    await run(`
      CREATE TABLE IF NOT EXISTS operation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        module TEXT NOT NULL,
        description TEXT,
        username TEXT NOT NULL,
        status TEXT DEFAULT 'success',
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username) REFERENCES users(username)
      )
    `);

    // 检查是否需要插入管理员账户
    const [adminUser] = await get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin']
      );
    }

    // 创建students表
    await run(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        student_id TEXT UNIQUE NOT NULL,
        grade TEXT NOT NULL,
        class TEXT,
        teacher TEXT,
        photo_url TEXT,
        address TEXT,
        emergency_contact TEXT,
        emergency_phone TEXT,
        notes TEXT,
        status TEXT CHECK(status IN ('正常', '警告', '严重警告', '记过', '留校察看', '勒令退学', '开除学籍')) DEFAULT '正常'
      )
    `);

    // 检查是否需要添加status列
    try {
      // 检查status列是否存在
      await get('SELECT status FROM students LIMIT 1');
    } catch (err) {
      if (err.message.includes('no such column: status')) {
        console.log('正在添加status列...');
        // 添加status列
        await run(`
          ALTER TABLE students 
          ADD COLUMN status TEXT 
          CHECK(status IN ('正常', '警告', '严重警告', '记过', '留校察看', '勒令退学', '开除学籍')) 
          DEFAULT '正常'
        `);
        console.log('status列添加完成');
      }
    }

    // 创建behavior_types表
    await run(`
      CREATE TABLE IF NOT EXISTS behavior_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        score INTEGER NOT NULL DEFAULT 0
      )
    `);

    // 检查是否需要添加score列
    try {
      // 检查score列是否存在
      await get('SELECT score FROM behavior_types LIMIT 1');
    } catch (err) {
      if (err.message.includes('no such column: score')) {
        console.log('正在添加score列...');
        // 添加score列
        await run(`
          ALTER TABLE behavior_types 
          ADD COLUMN score INTEGER NOT NULL DEFAULT 0
        `);
        console.log('score列添加完成');
      }
    }

    // 创建behaviors表
    await run(`
      CREATE TABLE IF NOT EXISTS behaviors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        behavior_type TEXT NOT NULL,
        description TEXT,
        date TIMESTAMP DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime')),
        image_url TEXT,
        process_result TEXT,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (behavior_type) REFERENCES behavior_types (name)
      )
    `);

    // 检查是否需要添加process_result列
    try {
      // 检查process_result列是否存在
      await get('SELECT process_result FROM behaviors LIMIT 1');
    } catch (err) {
      if (err.message.includes('no such column: process_result')) {
        console.log('正在添加process_result列...');
        // 添加process_result列
        await run(`
          ALTER TABLE behaviors 
          ADD COLUMN process_result TEXT
        `);
        console.log('process_result列添加完成');
      }
    }

    // 创建score_items表
    await run(`
      CREATE TABLE IF NOT EXISTS score_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT CHECK(category IN ('加分', '减分')) NOT NULL,
        score REAL NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime')),
        updated_at TIMESTAMP DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime'))
      )
    `);

    // 创建teacher_behaviors表
    await run(`
      CREATE TABLE IF NOT EXISTS teacher_behaviors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_name TEXT NOT NULL,
        behavior_type TEXT NOT NULL,
        description TEXT NOT NULL,
        date TIMESTAMP DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime')),
        process_result TEXT,
        score REAL NOT NULL DEFAULT 0,
        score_item_id INTEGER REFERENCES score_items(id),
        created_at TIMESTAMP DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime')),
        updated_at TIMESTAMP DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime'))
      )
    `);

    // 检查是否需要添加score_item_id列
    try {
      await get('SELECT score_item_id FROM teacher_behaviors LIMIT 1');
    } catch (err) {
      if (err.message.includes('no such column: score_item_id')) {
        console.log('正在添加score_item_id列...');
        await run(`
          ALTER TABLE teacher_behaviors 
          ADD COLUMN score_item_id INTEGER REFERENCES score_items(id)
        `);
        console.log('score_item_id列添加完成');
      }
    }

    // 创建class_scores表
    await run(`
      CREATE TABLE IF NOT EXISTS class_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grade TEXT NOT NULL,
        class TEXT NOT NULL,
        total_score REAL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime')),
        UNIQUE(grade, class)
      )
    `);

    // 检查是否需要插入基本行为类型
    const [typeCount] = await get('SELECT COUNT(*) as count FROM behavior_types');
    if (typeCount.count === 0) {
      const basicTypes = [
        ['迟到', '违纪', '上课迟到', -1],
        ['早退', '违纪', '未经许可提前离开', -1],
        ['打架', '违纪', '与他人发生肢体冲突', -3],
        ['帮助同学', '优秀', '主动帮助有困难的同学', 1],
        ['志愿服务', '优秀', '参与学校志愿服务活动', 2],
        ['获奖', '优秀', '在比赛或竞赛中获奖', 3]
      ];

      for (const [name, category, description, score] of basicTypes) {
        await run(
          'INSERT INTO behavior_types (name, category, description, score) VALUES (?, ?, ?, ?)',
          [name, category, description, score]
        );
      }
    }

    // 检查是否需要插入基本加减分项
    const [scoreItemCount] = await get('SELECT COUNT(*) as count FROM score_items');
    if (scoreItemCount.count === 0) {
      const basicScoreItems = [
        ['课堂表现优秀', '加分', 2, '在课堂上积极参与，表现突出'],
        ['参与志愿服务', '加分', 3, '参与学校或社会志愿服务活动'],
        ['获得竞赛奖项', '加分', 5, '在学科竞赛中获得奖项'],
        ['违反课堂纪律', '减分', -2, '在课堂上扰乱秩序'],
        ['迟到早退', '减分', -1, '无故迟到或早退'],
        ['违反校规', '减分', -3, '违反学校规章制度']
      ];

      for (const [name, category, score, description] of basicScoreItems) {
        await run(
          'INSERT INTO score_items (name, category, score, description) VALUES (?, ?, ?, ?)',
          [name, category, score, description]
        );
      }
    }
  } catch (err) {
    throw err;
  }
}

// 工具函数：将db.run转换为Promise
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

// 工具函数：将db.get转换为Promise
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  getDatabase,
  initDatabase,
  run,
  get
};