const express = require('express');
const router = express.Router();
const { get, run } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// 获取所有教师行为记录
router.get('/', authenticateToken, async (req, res) => {
  try {
    const behaviors = await get('SELECT * FROM teacher_behaviors ORDER BY date DESC');
    res.json(behaviors);
  } catch (error) {
    console.error('获取教师行为记录失败:', error);
    await logger.logOperation({
      type: 'ERROR',
      module: 'teacher-behaviors',
      description: '获取教师行为记录失败',
      username: req.user.username,
      status: 'error',
      details: { error: error.message }
    });
    res.status(500).json({ message: '获取教师行为记录失败' });
  }
});

// 添加新的教师行为记录
router.post('/', authenticateToken, async (req, res) => {
  const { teacher_name, behavior_type, description, date, process_result, score } = req.body;

  if (!teacher_name || !behavior_type || !description) {
    return res.status(400).json({ message: '教师姓名、行为类型和描述为必填项' });
  }

  try {
    // 从教师名称中提取年级和班级
    const match = teacher_name.match(/(高[一二三])(\d+)班/);
    if (!match) {
      return res.status(400).json({ message: '教师名称格式不正确，应包含年级和班级信息（例如：高一1班）' });
    }

    const [, grade, classNum] = match;
    console.log('提取的年级和班级信息:', { grade, classNum });

    // 开始数据库事务
    await run('BEGIN TRANSACTION');

    try {
      // 获取行为类型对应的分数项
      const [scoreItem] = await get('SELECT * FROM score_items WHERE name = ?', [behavior_type]);
      if (!scoreItem) {
        return res.status(400).json({ message: '无效的行为类型' });
      }

      // 添加教师行为记录
      const result = await run(
        `INSERT INTO teacher_behaviors 
         (teacher_name, behavior_type, description, date, process_result, score, score_item_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [teacher_name, behavior_type, description, date, process_result, scoreItem.score, scoreItem.id]
      );

      console.log('教师行为记录添加成功，ID:', result.lastID);

      // 更新班级分数
      console.log('准备更新班级分数:', { grade, class: classNum, score });
      await updateClassScore(grade, classNum, score);
      console.log('班级分数更新成功');

      // 提交事务
      await run('COMMIT');

      const [newBehavior] = await get('SELECT * FROM teacher_behaviors WHERE id = ?', [result.lastID]);
      
      await logger.logOperation({
        type: 'CREATE',
        module: 'teacher-behaviors',
        description: '添加教师行为记录成功',
        username: req.user.username,
        status: 'success',
        details: { behavior: { teacher_name, behavior_type, score }, classInfo: { grade, class: classNum } }
      });

      res.status(201).json(newBehavior);
    } catch (error) {
      // 如果出错，回滚事务
      await run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('添加教师行为记录失败:', error);
    await logger.logOperation({
      type: 'ERROR',
      module: 'teacher-behaviors',
      description: '添加教师行为记录失败',
      username: req.user.username,
      status: 'error',
      details: { error: error.message, behavior: { teacher_name, behavior_type, score } }
    });
    res.status(500).json({ message: '添加教师行为记录失败' });
  }
});

// 更新教师行为记录
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { teacher_name, behavior_type, description, date, process_result, score } = req.body;

  if (!teacher_name || !behavior_type || !description) {
    return res.status(400).json({ message: '教师姓名、行为类型和描述为必填项' });
  }

  try {
    // 获取原记录的分数和教师信息
    const [oldRecord] = await get('SELECT * FROM teacher_behaviors WHERE id = ?', [id]);
    if (!oldRecord) {
      return res.status(404).json({ message: '教师行为记录不存在' });
    }

    // 从旧教师名称中提取年级和班级
    const oldMatch = oldRecord.teacher_name.match(/(高[一二三])(\d+)班/);
    if (!oldMatch) {
      return res.status(400).json({ message: '原教师名称格式不正确' });
    }
    const [, oldGrade, oldClassNum] = oldMatch;

    // 从新教师名称中提取年级和班级
    const newMatch = teacher_name.match(/(高[一二三])(\d+)班/);
    if (!newMatch) {
      return res.status(400).json({ message: '新教师名称格式不正确' });
    }
    const [, newGrade, newClassNum] = newMatch;

    console.log('更新前后的班级信息:', {
      old: { grade: oldGrade, class: oldClassNum, score: oldRecord.score },
      new: { grade: newGrade, class: newClassNum, score: score }
    });

    // 开始数据库事务
    await run('BEGIN TRANSACTION');

    try {
      // 获取行为类型对应的分数项
      const [scoreItem] = await get('SELECT * FROM score_items WHERE name = ?', [behavior_type]);
      if (!scoreItem) {
        return res.status(400).json({ message: '无效的行为类型' });
      }

      // 更新教师行为记录
      await run(
        `UPDATE teacher_behaviors 
         SET teacher_name = ?, behavior_type = ?, description = ?, 
             date = ?, process_result = ?, score = ?, score_item_id = ?,
             updated_at = datetime(CURRENT_TIMESTAMP,'localtime')
         WHERE id = ?`,
        [teacher_name, behavior_type, description, date, process_result, scoreItem.score, scoreItem.id, id]
      );

      // 如果班级发生变化，需要更新两个班级的分数
      if (oldGrade !== newGrade || oldClassNum !== newClassNum) {
        // 从旧班级中减去原来的分数
        console.log('从旧班级中减去分数:', { grade: oldGrade, class: oldClassNum, score: -oldRecord.score });
        await updateClassScore(oldGrade, oldClassNum, -oldRecord.score);

        // 给新班级添加新的分数
        console.log('给新班级添加分数:', { grade: newGrade, class: newClassNum, score: score });
        await updateClassScore(newGrade, newClassNum, score);
      } else {
        // 同一个班级，只需要更新分数差值
        const scoreDiff = score - oldRecord.score;
        console.log('更新班级分数差值:', { grade: newGrade, class: newClassNum, scoreDiff });
        await updateClassScore(newGrade, newClassNum, scoreDiff);
      }

      // 提交事务
      await run('COMMIT');

      const [updatedBehavior] = await get('SELECT * FROM teacher_behaviors WHERE id = ?', [id]);
      
      await logger.logOperation({
        type: 'UPDATE',
        module: 'teacher-behaviors',
        description: '更新教师行为记录成功',
        username: req.user.username,
        status: 'success',
        details: { 
          behavior: { id, teacher_name, behavior_type, score },
          classChange: {
            from: { grade: oldGrade, class: oldClassNum },
            to: { grade: newGrade, class: newClassNum }
          }
        }
      });

      res.json(updatedBehavior);
    } catch (error) {
      // 如果出错，回滚事务
      await run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('更新教师行为记录失败:', error);
    await logger.logOperation({
      type: 'ERROR',
      module: 'teacher-behaviors',
      description: '更新教师行为记录失败',
      username: req.user.username,
      status: 'error',
      details: { error: error.message, behavior: { id, teacher_name, behavior_type, score } }
    });
    res.status(500).json({ message: '更新教师行为记录失败' });
  }
});

// 删除教师行为记录
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 获取要删除的记录信息
    const [behaviorToDelete] = await get('SELECT * FROM teacher_behaviors WHERE id = ?', [id]);
    
    if (!behaviorToDelete) {
      return res.status(404).json({ message: '教师行为记录不存在' });
    }

    // 从教师名称中提取年级和班级
    const match = behaviorToDelete.teacher_name.match(/(高[一二三])(\d+)班/);
    if (!match) {
      return res.status(400).json({ message: '教师名称格式不正确' });
    }
    const [, grade, classNum] = match;

    console.log('准备删除记录并更新班级分数:', {
      teacher: behaviorToDelete.teacher_name,
      grade,
      class: classNum,
      score: -behaviorToDelete.score
    });

    // 开始数据库事务
    await run('BEGIN TRANSACTION');

    try {
      // 删除教师行为记录
      await run('DELETE FROM teacher_behaviors WHERE id = ?', [id]);

      // 更新班级分数（减去被删除记录的分数）
      await updateClassScore(grade, classNum, -behaviorToDelete.score);
      console.log('班级分数更新成功');

      // 提交事务
      await run('COMMIT');

      await logger.logOperation({
        type: 'DELETE',
        module: 'teacher-behaviors',
        description: '删除教师行为记录成功',
        username: req.user.username,
        status: 'success',
        details: { 
          behavior: behaviorToDelete,
          classInfo: { grade, class: classNum }
        }
      });

      res.json({ message: '删除成功' });
    } catch (error) {
      // 如果出错，回滚事务
      await run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('删除教师行为记录失败:', error);
    await logger.logOperation({
      type: 'ERROR',
      module: 'teacher-behaviors',
      description: '删除教师行为记录失败',
      username: req.user.username,
      status: 'error',
      details: { error: error.message, behaviorId: id }
    });
    res.status(500).json({ message: '删除教师行为记录失败' });
  }
});

// 辅助函数：更新班级分数
async function updateClassScore(grade, className, score) {
  try {
    console.log('开始更新班级分数:', { grade, class: className, score });
    
    // 检查班级记录是否存在
    const [existingRecord] = await get(
      'SELECT * FROM class_scores WHERE grade = ? AND class = ?',
      [grade, className]
    );
    console.log('现有班级记录:', existingRecord);

    if (existingRecord) {
      // 更新现有记录
      console.log('更新现有记录，当前总分:', existingRecord.total_score, '变化分数:', score);
      await run(
        `UPDATE class_scores 
         SET total_score = total_score + ?,
             updated_at = datetime(CURRENT_TIMESTAMP,'localtime')
         WHERE grade = ? AND class = ?`,
        [score, grade, className]
      );
      console.log('记录更新成功');
    } else {
      // 创建新记录
      console.log('创建新记录，初始分数:', score);
      await run(
        `INSERT INTO class_scores (grade, class, total_score)
         VALUES (?, ?, ?)`,
        [grade, className, score]
      );
      console.log('新记录创建成功');
    }

    // 验证更新结果
    const [updatedRecord] = await get(
      'SELECT * FROM class_scores WHERE grade = ? AND class = ?',
      [grade, className]
    );
    console.log('更新后的记录:', updatedRecord);
  } catch (error) {
    console.error('更新班级分数失败:', error);
    throw error;
  }
}

module.exports = router; 