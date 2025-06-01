const { run, get } = require('../models/database');

async function migrateGrades() {
  try {
    // 开始事务
    await run('BEGIN TRANSACTION');

    try {
      // 获取所有学生
      const students = await get('SELECT id, grade FROM students');
      const currentYear = new Date().getFullYear();
      
      // 更新每个学生的年级
      for (const student of students) {
        let newGrade;
        switch (student.grade) {
          case '高一':
            newGrade = `${currentYear + 2}级`;
            break;
          case '高二':
            newGrade = `${currentYear + 1}级`;
            break;
          case '高三':
            newGrade = `${currentYear}级`;
            break;
          default:
            // 如果已经是新格式，跳过
            if (/^\d{4}级$/.test(student.grade)) {
              continue;
            }
            // 未知格式，设为当前年级
            newGrade = `${currentYear}级`;
        }

        // 更新学生年级
        await run(
          'UPDATE students SET grade = ? WHERE id = ?',
          [newGrade, student.id]
        );
      }

      // 提交事务
      await run('COMMIT');
      console.log('年级格式迁移完成');
    } catch (err) {
      // 如果出错，回滚事务
      await run('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('年级迁移失败:', err);
    process.exit(1);
  }
}

// 执行迁移
migrateGrades(); 