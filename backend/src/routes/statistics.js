const express = require('express');
const { get } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取Dashboard统计数据
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    console.info('=== 开始获取 Dashboard 统计数据 ===');
    const { start_date, end_date, grade } = req.query;
    console.info('请求参数:', {
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
        console.warn('无效的开始日期:', start_date);
      }
      dateCondition += ' AND b.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      if (!isValidDate(end_date)) {
        console.warn('无效的结束日期:', end_date);
      }
      dateCondition += ' AND b.date <= ?';
      params.push(end_date);
    }
    if (grade) {
      if (!['高一', '高二', '高三'].includes(grade)) {
        console.warn('无效的年级值:', grade);
      }
      gradeCondition = ' AND s.grade = ?';
      params.push(grade);
    }

    console.info('SQL条件参数:', {
      dateCondition,
      gradeCondition,
      params
    });

    // 1. 获取学生总数
    console.info('开始获取学生总数...');
    const studentCountQuery = 'SELECT COUNT(*) as count FROM students' + (grade ? ' WHERE grade = ?' : '');
    const [studentCount] = await get(studentCountQuery, grade ? [grade] : []);
    console.info('学生总数:', studentCount);

    // 2. 获取行为记录总数
    console.info('开始获取行为记录总数...');
    const behaviorCountQuery = `
      SELECT COUNT(*) as count 
      FROM behaviors b 
      JOIN students s ON b.student_id = s.id 
      WHERE 1=1 ${dateCondition} ${gradeCondition}
    `;
    const [behaviorCount] = await get(behaviorCountQuery, params);
    console.info('行为记录总数:', behaviorCount);

    // 3. 获取年级分布
    console.info('开始获取年级分布...');
    const gradeDistQuery = `
      SELECT grade, COUNT(*) as count
      FROM students
      GROUP BY grade
    `;
    const gradeDist = await get(gradeDistQuery);
    console.info('年级分布数据:', gradeDist);

    // 4. 获取行为类别统计
    console.info('开始获取行为类别统计...');
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
    console.info('行为类别统计:', behaviorStats);

    // 5. 获取行为类型分布
    console.info('开始获取行为类型分布...');
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
    console.info('行为类型分布:', typeDistribution);

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
    console.info('开始获取班级违纪排名...');
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
    console.info('班级违纪排名:', classRanking);

    // 7. 获取时间趋势
    console.info('开始获取时间趋势...');
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
    console.info('时间趋势数据:', trend);

    // 8. 获取最近违纪记录
    console.info('开始获取最近违纪记录...');
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
    console.info('最近违纪记录:', recentViolations);

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
    console.info('数据验证结果:', {
      hasStudentCount: studentCount.count > 0,
      hasBehaviorCount: behaviorCount.count > 0,
      hasGradeDistribution: gradeDist.length > 0,
      hasBehaviorStats: behaviorStats.length > 0,
      hasTypeDistribution: typeDistribution.length > 0,
      hasClassRanking: classRanking.length > 0,
      hasTrendData: trend.length > 0,
      hasRecentViolations: recentViolations.length > 0
    });

    console.info('返回的完整数据结构:', {
      hasOverview: !!responseData.overview,
      hasClassRanking: !!responseData.class_ranking,
      hasTrend: !!responseData.trend,
      hasRecentViolations: !!responseData.recent_violations,
      hasTypeDistribution: !!responseData.type_distribution
    });

    res.json(responseData);
    console.info('=== Dashboard 统计数据获取完成 ===');

  } catch (err) {
    console.error('获取Dashboard统计数据失败:', {
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
    console.info('=== 开始获取统计分析数据 ===');
    const { grade, start_date, end_date } = req.query;
    console.info('接收到的请求参数:', {
      grade,
      start_date,
      end_date,
      headers: req.headers,
      url: req.url
    });

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

    // 获取各年级违纪率数据
    const violationRateQuery = `
      WITH GradeStats AS (
        SELECT 
          COALESCE(s.grade, '未知') as grade,
          COUNT(DISTINCT s.id) as total_students,
          COUNT(DISTINCT CASE WHEN bt.category = '违纪' THEN b.student_id END) as violation_students
        FROM students s
        LEFT JOIN behaviors b ON s.id = b.student_id AND 1=1 ${dateCondition}
        LEFT JOIN behavior_types bt ON b.behavior_type = bt.name
        WHERE 1=1 ${gradeCondition}
        GROUP BY s.grade
      )
      SELECT 
        grade,
        total_students,
        COALESCE(violation_students, 0) as violation_students,
        ROUND(COALESCE(violation_students * 100.0 / NULLIF(total_students, 0), 0), 2) as violation_rate
      FROM GradeStats
      ORDER BY 
        CASE grade
          WHEN '高一' THEN 1
          WHEN '高二' THEN 2
          WHEN '高三' THEN 3
          ELSE 4
        END
    `;

    // 获取月度违纪率趋势
    const monthlyTrendQuery = `
      WITH MonthlyStats AS (
        SELECT 
          strftime('%Y-%m', COALESCE(b.date, date('now'))) as month,
          COUNT(DISTINCT s.id) as total_students,
          COUNT(DISTINCT CASE WHEN bt.category = '违纪' THEN b.student_id END) as violation_students
        FROM students s
        LEFT JOIN behaviors b ON s.id = b.student_id AND 1=1 ${dateCondition}
        LEFT JOIN behavior_types bt ON b.behavior_type = bt.name
        WHERE 1=1 ${gradeCondition}
        GROUP BY strftime('%Y-%m', COALESCE(b.date, date('now')))
      )
      SELECT 
        month,
        total_students,
        COALESCE(violation_students, 0) as violation_students,
        ROUND(COALESCE(violation_students * 100.0 / NULLIF(total_students, 0), 0), 2) as violation_rate
      FROM MonthlyStats
      ORDER BY month
    `;

    // 获取总体违纪率
    const totalStatsQuery = `
      SELECT 
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT CASE WHEN bt.category = '违纪' THEN b.student_id END) as violation_students,
        ROUND(COALESCE(COUNT(DISTINCT CASE WHEN bt.category = '违纪' THEN b.student_id END) * 100.0 / 
          NULLIF(COUNT(DISTINCT s.id), 0), 0), 2) as total_violation_rate
      FROM students s
      LEFT JOIN behaviors b ON s.id = b.student_id AND 1=1 ${dateCondition}
      LEFT JOIN behavior_types bt ON b.behavior_type = bt.name
      WHERE 1=1 ${gradeCondition}
    `;

    // 执行查询
    const [violationRates, monthlyTrends, totalStats] = await Promise.all([
      get(violationRateQuery, params),
      get(monthlyTrendQuery, params),
      get(totalStatsQuery, params)
    ]);

    // 准备返回数据
    const responseData = {
      totalStudents: totalStats[0].total_students,
      totalViolationStudents: totalStats[0].violation_students,
      totalViolationRate: totalStats[0].total_violation_rate,
      gradeViolationRates: violationRates,
      monthlyTrends: monthlyTrends
    };

    console.info('准备返回的数据:', responseData);
    res.json(responseData);
    console.info('=== 统计分析数据获取完成 ===');

  } catch (err) {
    console.error('获取统计数据失败:', {
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