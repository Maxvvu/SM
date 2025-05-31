const { run } = require('../src/models/database');
const { generateMockStudents } = require('../src/utils/mockData');
const { logger } = require('../src/utils/logger');

async function insertMockStudents() {
  try {
    const students = generateMockStudents(100);
    let successCount = 0;

    for (const student of students) {
      try {
        await run(
          `INSERT INTO students (name, student_id, grade, class, photo_url, address, emergency_contact, emergency_phone, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            student.name,
            student.student_id,
            student.grade,
            student.class,
            student.photo_url,
            student.address,
            student.emergency_contact,
            student.emergency_phone,
            student.notes
          ]
        );
        successCount++;
        
        if (successCount % 10 === 0) {
          logger.info(`已成功插入 ${successCount} 条学生记录`);
        }
      } catch (err) {
        logger.error(`插入学生记录失败:`, {
          student: student.name,
          error: err.message
        });
      }
    }

    logger.info(`批量插入完成，共成功插入 ${successCount} 条学生记录`);
    process.exit(0);
  } catch (err) {
    logger.error('批量插入学生记录时发生错误:', err);
    process.exit(1);
  }
}

// 执行插入操作
insertMockStudents(); 