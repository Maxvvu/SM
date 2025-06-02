const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 定义允许的操作类型

// 数据库连接
const dbPath = path.join(__dirname, '../database.sqlite');
let db;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath);
    db.run('PRAGMA foreign_keys = ON');
  }
  return db;
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

class Logger {
  // 记录操作日志
  async logOperation(operation) {
    const { 
      type, 
      module, 
      description, 
      username, 
      status = 'success', 
      details = {} 
    } = operation;

    try {
      // 检查用户是否存在
      const [user] = await get('SELECT username FROM users WHERE username = ?', [username]);
      if (!user) {
        console.error('记录日志失败：用户不存在', username);
        return;
      }

      // 将details对象转换为JSON字符串
      const detailsJson = JSON.stringify(details);

      // 插入日志记录到数据库
      const result = await run(
        `INSERT INTO operation_logs (type, module, description, username, status, details) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [type, module, description, username, status, detailsJson]
      );

      return {
        id: result.lastID,
        type,
        module,
        description,
        username,
        status,
        details,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('记录操作日志失败:', err);
      // 不抛出错误，让操作继续进行
      return null;
    }
  }

  // 读取操作日志
  async getOperationLogs(options = {}) {
    const { 
      page = 1, 
      pageSize = 10, 
      type = '', 
      startDate = null, 
      endDate = null 
    } = options;

    try {
      let query = 'SELECT * FROM operation_logs WHERE 1=1';
      const params = [];

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }

      if (startDate) {
        query += ' AND timestamp >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND timestamp <= ?';
        params.push(endDate);
      }

      // 获取总记录数
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const [{ total }] = await get(countQuery, params);

      // 添加排序和分页
      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

      // 获取分页数据
      const logs = await get(query, params);

      // 解析details字段
      const parsedLogs = logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : {}
      }));

      return {
        total,
        logs: parsedLogs,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      };
    } catch (err) {
      console.error('获取操作日志失败:', err);
      throw err;
    }
  }

  // 删除操作日志
  async deleteOperationLogs(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        return { deletedCount: 0 };
      }

      const placeholders = ids.map(() => '?').join(',');
      const result = await run(
        `DELETE FROM operation_logs WHERE id IN (${placeholders})`,
        ids
      );

      return {
        deletedCount: result.changes,
        message: '日志删除成功'
      };
    } catch (err) {
      console.error('删除操作日志失败:', err);
      throw err;
    }
  }
}

const logger = new Logger();
module.exports = { logger }; 