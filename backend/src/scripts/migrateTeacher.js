const { run, get } = require('../models/database');

async function migrateTeacher() {
  try {
    // 开始事务
    await run('BEGIN TRANSACTION');

    try {
      // 检查 teacher 列是否存在
      try {
        await get('SELECT teacher FROM students LIMIT 1');
        console.log('teacher 列已存在，无需迁移');
      } catch (err) {
        if (err.message.includes('no such column: teacher')) {
          console.log('正在添加 teacher 列...');
          // 添加 teacher 列
          await run(`
            ALTER TABLE students 
            ADD COLUMN teacher TEXT
          `);
          console.log('teacher 列添加完成');
        }
      }

      // 提交事务
      await run('COMMIT');
      console.log('迁移完成');
    } catch (err) {
      // 如果出错，回滚事务
      await run('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('迁移失败:', err);
    process.exit(1);
  }
}

// 执行迁移
migrateTeacher(); 