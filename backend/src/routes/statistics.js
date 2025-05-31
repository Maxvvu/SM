const express = require('express');
const { get } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// 获取行为类型统计
router.get('/behavior-types', authenticateToken, async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT 
        bt.name,
        bt.category,
        COUNT(b.id) as count
      FROM behavior_types bt
      LEFT JOIN behaviors b ON bt.name = b.behavior_type
    `;

    const params = [];
    if (start_date || end_date) {
      query += ' WHERE 1=1';
      if (start_date) {
        query += ' AND b.date >= ?';
        params.push(start_date);
      }
      if (end_date) {
        query += ' AND b.date <= ?';
        params.push(end_date);
      }
    }

    query += ' GROUP BY bt.name, bt.category ORDER BY bt.category, count DESC';
    
    const statistics = await get(query, params);
    res.json(statistics);
  } catch (err) {
    next(err);
  }
});

// 获取班级行为统计
router.get('/class', authenticateToken, async (req, res, next) => {
  try {
    const { grade, start_date, end_date } = req.query;
    let query = `
      SELECT 
        s.grade,
        s.class,
        bt.category,
        COUNT(b.id) as count
      FROM students s
      LEFT JOIN behaviors b ON s.id = b.student_id
      LEFT JOIN behavior_types bt ON b.behavior_type = bt.name
      WHERE 1=1
    `;

    const params = [];
    if (grade) {
      query += ' AND s.grade = ?';
      params.push(grade);
    }
    if (start_date) {
      query += ' AND b.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND b.date <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY s.grade, s.class, bt.category ORDER BY s.grade, s.class, bt.category';
    
    const statistics = await get(query, params);
    res.json(statistics);
  } catch (err) {
    next(err);
  }
});

// 获取学生行为统计
router.get('/student/:id', authenticateToken, async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT 
        s.name,
        s.grade,
        s.class,
        bt.name as behavior_type,
        bt.category,
        COUNT(b.id) as count
      FROM students s
      LEFT JOIN behaviors b ON s.id = b.student_id
      LEFT JOIN behavior_types bt ON b.behavior_type = bt.name
      WHERE s.id = ?
    `;

    const params = [req.params.id];
    if (start_date) {
      query += ' AND b.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND b.date <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY bt.name, bt.category ORDER BY bt.category, count DESC';
    
    const statistics = await get(query, params);
    if (statistics.length === 0) {
      return res.status(404).json({ message: '未找到该学生' });
    }
    res.json(statistics);
  } catch (err) {
    next(err);
  }
});

// 获取总体统计数据
router.get('/summary', authenticateToken, async (req, res, next) => {
  try {
    const [studentCount] = await get('SELECT COUNT(*) as count FROM students');
    const [behaviorCount] = await get('SELECT COUNT(*) as count FROM behaviors');
    const [typeCount] = await get('SELECT COUNT(*) as count FROM behavior_types');
    
    const recentBehaviors = await get(`
      SELECT 
        b.*,
        s.name as student_name,
        s.grade,
        s.class
      FROM behaviors b
      JOIN students s ON b.student_id = s.id
      ORDER BY b.date DESC
      LIMIT 5
    `);

    res.json({
      total_students: studentCount.count,
      total_behaviors: behaviorCount.count,
      total_behavior_types: typeCount.count,
      recent_behaviors: recentBehaviors
    });
  } catch (err) {
    next(err);
  }
});

// 获取统计分析数据
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { grade, start_date, end_date } = req.query;
    const params = [];
    let dateCondition = '';
    let gradeCondition = '';

    if (start_date) {
      dateCondition += ' AND b.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      dateCondition += ' AND b.date <= ?';
      params.push(end_date);
    }
    if (grade) {
      gradeCondition = ' AND s.grade = ?';
      params.push(grade);
    }

    // 1. 获取违纪和优秀表现总数
    const behaviorCountsQuery = `
      SELECT 
        bt.category,
        COUNT(DISTINCT b.id) as total_count,
        COUNT(DISTINCT b.student_id) as student_count
      FROM behaviors b
      JOIN behavior_types bt ON b.behavior_type = bt.name
      JOIN students s ON b.student_id = s.id
      WHERE 1=1 ${dateCondition} ${gradeCondition}
      GROUP BY bt.category
    `;
    const behaviorCounts = await get(behaviorCountsQuery, params);

    // 2. 获取行为类型分布
    const typeDistributionQuery = `
      SELECT 
        b.behavior_type as name,
        COUNT(*) as value
      FROM behaviors b
      JOIN students s ON b.student_id = s.id
      WHERE 1=1 ${dateCondition} ${gradeCondition}
      GROUP BY b.behavior_type
      ORDER BY value DESC
    `;
    const typeDistribution = await get(typeDistributionQuery, params);

    // 3. 获取年级行为趋势
    const gradeParams = [...params];
    if (grade) {
      gradeParams.pop(); // 移除年级条件
    }
    const gradeTrendQuery = `
      SELECT 
        s.grade,
        bt.category,
        COUNT(*) as count
      FROM behaviors b
      JOIN students s ON b.student_id = s.id
      JOIN behavior_types bt ON b.behavior_type = bt.name
      WHERE 1=1 ${dateCondition}
      GROUP BY s.grade, bt.category
      ORDER BY s.grade
    `;
    const gradeTrend = await get(gradeTrendQuery, gradeParams);

    // 4. 获取时间趋势
    const timeTrendQuery = `
      SELECT 
        date(b.date) as date,
        bt.category,
        COUNT(*) as count
      FROM behaviors b
      JOIN students s ON b.student_id = s.id
      JOIN behavior_types bt ON b.behavior_type = bt.name
      WHERE 1=1 ${dateCondition} ${gradeCondition}
      GROUP BY date(b.date), bt.category
      ORDER BY date(b.date)
    `;
    const timeTrend = await get(timeTrendQuery, params);

    // 处理数据
    const violationData = behaviorCounts.find(item => item.category === '违纪') || { total_count: 0, student_count: 0 };
    const excellentData = behaviorCounts.find(item => item.category === '优秀') || { total_count: 0, student_count: 0 };

    // 处理年级趋势数据
    const gradeViolations = ['高一', '高二', '高三'].map(grade => {
      const data = gradeTrend.find(item => item.grade === grade && item.category === '违纪');
      return data ? data.count : 0;
    });
    const gradeExcellent = ['高一', '高二', '高三'].map(grade => {
      const data = gradeTrend.find(item => item.grade === grade && item.category === '优秀');
      return data ? data.count : 0;
    });

    // 处理时间趋势数据
    const violations = [];
    const excellent = [];
    timeTrend.forEach(item => {
      const point = [item.date, item.count];
      if (item.category === '违纪') {
        violations.push(point);
      } else {
        excellent.push(point);
      }
    });

    res.json({
      total_violations: violationData.total_count,
      total_excellent: excellentData.total_count,
      violation_students: violationData.student_count,
      excellent_students: excellentData.student_count,
      behavior_type_distribution: typeDistribution,
      grade_violations: gradeViolations,
      grade_excellent: gradeExcellent,
      time_trend: {
        violations,
        excellent
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 