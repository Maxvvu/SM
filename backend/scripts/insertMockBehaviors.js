const { run, get } = require('../src/models/database');
const { generateRandomBehavior } = require('../src/utils/mockData');
const { logger } = require('../src/utils/logger');

async function insertMockBehaviors() {
  try {
    // 首先获取所有学生的ID
    const students = await get('SELECT id FROM students');
    const studentIds = students.map(student => student.id);

    if (studentIds.length === 0) {

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

        }
      } catch (err) {

      }
    }


    process.exit(0);
  } catch (err) {

    process.exit(1);
  }
}

// 执行插入操作
insertMockBehaviors(); 