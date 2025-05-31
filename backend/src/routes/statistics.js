const express = require('express');
const { get } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// 获取Dashboard统计数据
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    logger.info('=== 开始获取 Dashboard 统计数据 ===');
    const { start_date, end_date, grade } = req.query;
    logger.info('请求参数:', {
      start_date,
      end_date,
      grade,
      headers: req.headers,
      url: req.url
    });

    const params = [];
    let dateCondition = '';
    let gradeCondition = '';

    // 日期条件处理
    if (start_date) {
      if (!isValidDate(start_date)) {
        logger.warn('无效的开始日期:', start_date);
      }
      dateCondition += ' AND b.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      if (!isValidDate(end_date)) {
        logger.warn('无效的结束日期:', end_date);
      }
      dateCondition += ' AND b.date <= ?';
      params.push(end_date);
    }
    if (grade) {
      if (!['高一', '高二', '高三'].includes(grade)) {
        logger.warn('无效的年级值:', grade);
      }
      gradeCondition = ' AND s.grade = ?';
      params.push(grade);
    }

    logger.info('SQL条件参数:', {
      dateCondition,
      gradeCondition,
      params
    });

    // 1. 获取学生总数
    logger.info('开始获取学生总数...');
    const studentCountQuery = 'SELECT COUNT(*) as count FROM students' + (grade ? ' WHERE grade = ?' : '');
    const [studentCount] = await get(studentCountQuery, grade ? [grade] : []);
    logger.info('学生总数:', studentCount);

    // 2. 获取行为记录总数
    logger.info('开始获取行为记录总数...');
    const behaviorCountQuery = `
      SELECT COUNT(*) as count 
      FROM behaviors b 
      JOIN students s ON b.student_id = s.id 
      WHERE 1=1 ${dateCondition} ${gradeCondition}
    `;
    const [behaviorCount] = await get(behaviorCountQuery, params);
    logger.info('行为记录总数:', behaviorCount);

    // 3. 获取年级分布
    logger.info('开始获取年级分布...');
    const gradeDistQuery = `
      SELECT grade, COUNT(*) as count
      FROM students
      GROUP BY grade
    `;
    const gradeDist = await get(gradeDistQuery);
    logger.info('年级分布数据:', gradeDist);

    // 4. 获取行为类别统计
    logger.info('开始获取行为类别统计...');
    const behaviorStatsQuery = `
      SELECT 
        bt.category,
        COUNT(DISTINCT b.id) as total_count,
        COUNT(DISTINCT b.student_id) as student_count,
        ROUND(COUNT(DISTINCT b.id) * 100.0 / ${studentCount.count}, 2) as percentage
      FROM behaviors b
      JOIN behavior_types bt ON b.behavior_type = bt.name
      JOIN students s ON b.student_id = s.id
      WHERE 1=1 ${dateCondition} ${gradeCondition}
      GROUP BY bt.category
    `;
    const behaviorStats = await get(behaviorStatsQuery, params);
    logger.info('行为类别统计:', behaviorStats);

    // 5. 获取行为类型分布
    logger.info('开始获取行为类型分布...');
    const typeDistributionQuery = `
      SELECT 
        b.behavior_type as name,
        bt.category,
        COUNT(*) as value,
        ROUND(COUNT(*) * 100.0 / (
          SELECT COUNT(*) 
          FROM behaviors 
          WHERE behavior_type IN (
            SELECT name 
            FROM behavior_types 
            WHERE category = bt.category
          )
        ), 2) as percentage
      FROM behaviors b
      JOIN behavior_types bt ON b.behavior_type = bt.name
      JOIN students s ON b.student_id = s.id
      WHERE 1=1 ${dateCondition} ${gradeCondition}
      GROUP BY b.behavior_type, bt.category
      ORDER BY bt.category, value DESC
    `;
    const typeDistribution = await get(typeDistributionQuery, params);
    logger.info('行为类型分布:', typeDistribution);

    // 为行为类型添加颜色
    const violationColors = [
      '#FF6B6B', '#FF8787', '#FFA5A5',  // 红色系
      '#FF9F43', '#FFC069', '#FFE0B2'   // 橙色系
    ];
    
    const excellentColors = [
      '#4ECDC4', '#45B7D1', '#96CEB4',  // 蓝绿色系
      '#52C41A', '#73D13D', '#95DE64'   // 绿色系
    ];
    
    const typeDistributionWithColors = typeDistribution.map(item => ({
      ...item,
      percentage: `${item.percentage}%`,
      itemStyle: {
        color: item.category === '违纪' 
          ? violationColors[typeDistribution.filter(t => t.category === '违纪').indexOf(item) % violationColors.length]
          : excellentColors[typeDistribution.filter(t => t.category === '优秀').indexOf(item) % excellentColors.length]
      }
    }));

    // 6. 获取各班级违纪排名
    logger.info('开始获取班级违纪排名...');
    const classRankingQuery = `
      SELECT 
        s.grade,
        s.class,
        COUNT(b.id) as count,
        COUNT(DISTINCT b.student_id) as student_count
      FROM students s
      LEFT JOIN behaviors b ON s.id = b.student_id
      LEFT JOIN behavior_types bt ON b.behavior_type = bt.name
      WHERE bt.category = '违纪' ${dateCondition} ${gradeCondition}
      GROUP BY s.grade, s.class
      ORDER BY count DESC
      LIMIT 10
    `;
    const classRanking = await get(classRankingQuery, params);
    logger.info('班级违纪排名:', classRanking);

    // 7. 获取时间趋势
    logger.info('开始获取时间趋势...');
    const trendQuery = `
      SELECT 
        DATE(b.date) as date,
        bt.category,
        COUNT(*) as count
      FROM behaviors b
      JOIN students s ON b.student_id = s.id
      JOIN behavior_types bt ON b.behavior_type = bt.name
      WHERE 1=1 ${dateCondition} ${gradeCondition}
      GROUP BY DATE(b.date), bt.category
      ORDER BY date
    `;
    const trend = await get(trendQuery, params);
    logger.info('时间趋势数据:', trend);

    // 8. 获取最近违纪记录
    logger.info('开始获取最近违纪记录...');
    const recentQuery = `
      SELECT 
        b.date,
        s.name as student_name,
        s.grade,
        s.class,
        b.behavior_type,
        b.description
      FROM behaviors b
      JOIN students s ON b.student_id = s.id
      JOIN behavior_types bt ON b.behavior_type = bt.name
      WHERE bt.category = '违纪' ${dateCondition} ${gradeCondition}
      ORDER BY b.date DESC
      LIMIT 5
    `;
    const recentViolations = await get(recentQuery, params);
    logger.info('最近违纪记录:', recentViolations);

    // 准备返回数据
    const responseData = {
      overview: {
        total_students: studentCount.count,
        total_behaviors: behaviorCount.count,
        behavior_stats: behaviorStats,
        grade_distribution: gradeDist.reduce((acc, curr) => {
          acc[curr.grade] = curr.count;
          return acc;
        }, {})
      },
      class_ranking: classRanking,
      trend: trend,
      recent_violations: recentViolations,
      type_distribution: typeDistributionWithColors
    };

    // 数据验证
    logger.info('数据验证结果:', {
      hasStudentCount: studentCount.count > 0,
      hasBehaviorCount: behaviorCount.count > 0,
      hasGradeDistribution: gradeDist.length > 0,
      hasBehaviorStats: behaviorStats.length > 0,
      hasTypeDistribution: typeDistribution.length > 0,
      hasClassRanking: classRanking.length > 0,
      hasTrendData: trend.length > 0,
      hasRecentViolations: recentViolations.length > 0
    });

    logger.info('返回的完整数据结构:', {
      hasOverview: !!responseData.overview,
      hasClassRanking: !!responseData.class_ranking,
      hasTrend: !!responseData.trend,
      hasRecentViolations: !!responseData.recent_violations,
      hasTypeDistribution: !!responseData.type_distribution
    });

    res.json(responseData);
    logger.info('=== Dashboard 统计数据获取完成 ===');

  } catch (err) {
    logger.error('获取Dashboard统计数据失败:', {
      error: err.message,
      stack: err.stack,
      query: err.sql,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState,
      code: err.code
    });
    next(err);
  }
});

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
router.get('/analysis', authenticateToken, async (req, res, next) => {
  try {
    logger.info('=== 开始获取统计分析数据 ===');
    const { grade, start_date, end_date } = req.query;
    logger.info('接收到的请求参数:', {
      grade,
      start_date,
      end_date,
      headers: req.headers,
      url: req.url
    });

    // 验证日期格式
    if (start_date && !isValidDate(start_date)) {
      logger.warn('无效的开始日期格式:', start_date);
    }
    if (end_date && !isValidDate(end_date)) {
      logger.warn('无效的结束日期格式:', end_date);
    }

    // 验证年级值
    if (grade && !['高一', '高二', '高三'].includes(grade)) {
      logger.warn('无效的年级值:', grade);
    }

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

    logger.info('构建的查询条件:', {
      dateCondition,
      gradeCondition,
      params,
      hasDateFilter: !!dateCondition,
      hasGradeFilter: !!gradeCondition
    });

    // 1. 获取年级分布数据
    logger.info('开始查询年级分布...');
    const gradeQuery = `
      SELECT grade, COUNT(*) as count
      FROM students
      WHERE grade IN ('高一', '高二', '高三')
      GROUP BY grade
    `;
    logger.debug('年级分布SQL:', gradeQuery);
    const gradeResults = await get(gradeQuery);
    logger.info('年级分布原始数据:', gradeResults);

    // 初始化年级分布数据
    const gradeDistribution = {
      '高一': 0,
      '高二': 0,
      '高三': 0
    };

    let totalStudents = 0;
    gradeResults.forEach(result => {
      logger.debug('处理年级数据:', result);
      if (result.grade in gradeDistribution) {
        const count = parseInt(result.count);
        gradeDistribution[result.grade] = count;
        totalStudents += count;
        logger.debug(`年级 ${result.grade} 学生数: ${count}`);
      } else {
        logger.warn('发现未知年级:', result.grade);
      }
    });

    logger.info('年级分布统计结果:', {
      distribution: gradeDistribution,
      total: totalStudents
    });

    // 2. 获取行为统计数据
    logger.info('开始查询行为统计...');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    logger.info('当月日期范围:', {
      start: monthStart.toISOString(),
      end: monthEnd.toISOString()
    });

    const behaviorQuery = `
      SELECT 
        bt.category,
        COUNT(DISTINCT b.id) as count
      FROM behaviors b
      JOIN behavior_types bt ON b.behavior_type = bt.name
      WHERE b.date BETWEEN ? AND ?
      GROUP BY bt.category
    `;
    
    logger.debug('行为统计SQL:', behaviorQuery);
    logger.debug('行为统计参数:', [monthStart, monthEnd]);
    
    const behaviorResults = await get(behaviorQuery, [monthStart, monthEnd]);
    logger.info('行为统计原始数据:', behaviorResults);

    // 处理行为统计数据
    const behaviorStats = {
      violation: 0,
      excellent: 0
    };

    behaviorResults.forEach(result => {
      logger.debug('处理行为数据:', result);
      if (result.category === '违纪') {
        behaviorStats.violation = parseInt(result.count);
      } else if (result.category === '优秀') {
        behaviorStats.excellent = parseInt(result.count);
      } else {
        logger.warn('发现未知行为类别:', result.category);
      }
    });

    logger.info('行为统计结果:', behaviorStats);

    // 准备返回数据
    const responseData = {
      totalStudents,
      gradeDistribution,
      behaviorStats: {
        currentMonth: {
          violation: behaviorStats.violation,
          excellent: behaviorStats.excellent
        }
      }
    };

    logger.info('准备返回的数据:', responseData);
    logger.debug('数据验证:', {
      hasGradeData: Object.values(gradeDistribution).some(v => v > 0),
      hasBehaviorData: behaviorStats.violation > 0 || behaviorStats.excellent > 0,
      totalStudentsMatch: totalStudents === Object.values(gradeDistribution).reduce((a, b) => a + b, 0)
    });

    res.json(responseData);
    logger.info('=== 统计分析数据获取完成 ===');

  } catch (err) {
    logger.error('获取统计数据失败:', {
      error: err.message,
      stack: err.stack,
      query: err.sql,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState,
      code: err.code
    });
    next(err);
  }
});

// 辅助函数：验证日期格式
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = router; 