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
insertMockStudents(); 