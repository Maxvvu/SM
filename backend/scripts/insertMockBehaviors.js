const { run, get } = require('../src/models/database');
const { generateRandomBehavior } = require('../src/utils/mockData');
const { logger } = require('../src/utils/logger');

async function insertMockBehaviors() {
  try {
    // 首先获取所有学生的ID
    const students = await get('SELECT id FROM students');
    const studentIds = students.map(student => student.id);

    if (studentIds.length === 0) {
      logger.error('没有找到任何学生记录，请先添加学生数据');
      process.exit(1);
    }

    // 生成违纪记录
    const behaviors = await generateRandomBehavior(studentIds);
    let successCount = 0;

    // 首先确保行为类型存在
    const behaviorTypes = new Set(behaviors.map(b => ({ name: b.behavior_type, category: '违纪' })));
    for (const type of behaviorTypes) {
      try {
        await run(
          'INSERT OR IGNORE INTO behavior_types (name, category) VALUES (?, ?)',
          [type.name, type.category]
        );
      } catch (err) {
        logger.error(`添加行为类型失败: ${type.name}`, err);
      }
    }

    // 插入违纪记录
    for (const behavior of behaviors) {
      try {
        await run(
          `INSERT INTO behaviors (student_id, behavior_type, description, date, image_url)
           VALUES (?, ?, ?, ?, ?)`,
          [
            behavior.student_id,
            behavior.behavior_type,
            behavior.description,
            behavior.date,
            behavior.image_url
          ]
        );
        successCount++;
        
        if (successCount % 10 === 0) {
          logger.info(`已成功插入 ${successCount} 条违纪记录`);
        }
      } catch (err) {
        logger.error(`插入违纪记录失败:`, {
          studentId: behavior.student_id,
          type: behavior.behavior_type,
          error: err.message
        });
      }
    }

    logger.info(`批量插入完成，共成功插入 ${successCount} 条违纪记录`);
    process.exit(0);
  } catch (err) {
    logger.error('批量插入违纪记录时发生错误:', err);
    process.exit(1);
  }
}

// 执行插入操作
insertMockBehaviors(); 