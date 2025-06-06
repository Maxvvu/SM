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
    const studentCountQuery = `
      SELECT COUNT(*) as count 
      FROM students 
      WHERE grade IN ('高一', '高二', '高三')
      ${grade ? ' AND grade = ?' : ''}
    `;
    const [studentCount] = await get(studentCountQuery, grade ? [grade] : []);
    console.info('学生总数:', studentCount);

    // 2. 获取行为记录总数
    console.info('开始获取行为记录总数...');
    const behaviorCountQuery = `
      SELECT COUNT(*) as count 
      FROM behaviors b 
      JOIN students s ON b.student_id = s.id 
      WHERE s.grade IN ('高一', '高二', '高三')
      ${dateCondition} ${gradeCondition}
    `;
    const [behaviorCount] = await get(behaviorCountQuery, params);
    console.info('行为记录总数:', behaviorCount);

    // 3. 获取年级分布
    console.info('开始获取年级分布...');
    const gradeDistQuery = `
      SELECT grade, COUNT(*) as count
      FROM students
      WHERE grade IN ('高一', '高二', '高三')
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
    const { start_date, end_date, grade, class: classNum } = req.query;
    console.info('请求参数:', {
      start_date,
      end_date,
      grade,
      class: classNum,
      headers: req.headers,
      url: req.url
    });

    const params = [];
    let dateCondition = '';
    let gradeCondition = '';
    let classCondition = '';

    // 日期条件处理
    if (start_date && isValidDate(start_date)) {
      dateCondition += ' AND b.date >= ?';
      params.push(start_date);
    }
    if (end_date && isValidDate(end_date)) {
      dateCondition += ' AND b.date <= ?';
      params.push(end_date);
    }

    // 年级条件处理
    if (grade && ['高一', '高二', '高三'].includes(grade)) {
      gradeCondition = ' AND s.grade = ?';
      params.push(grade);
    }

    // 班级条件处理
    if (classNum && !isNaN(classNum) && parseInt(classNum) > 0) {
      classCondition = ' AND s.class = ?';
      params.push(parseInt(classNum));
    }

    console.info('SQL条件参数:', {
      dateCondition,
      gradeCondition,
      classCondition,
      params
    });

    // 获取总体统计数据
    const totalStatsQuery = `
      SELECT 
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT CASE WHEN bt.category = '违纪' THEN b.student_id END) as violation_students,
        COUNT(CASE WHEN bt.category = '违纪' THEN b.id END) as total_violations,
        ROUND(COALESCE(COUNT(DISTINCT CASE WHEN bt.category = '违纪' THEN b.student_id END) * 100.0 / 
          NULLIF(COUNT(DISTINCT s.id), 0), 0), 2) as total_violation_rate
      FROM students s
      LEFT JOIN behaviors b ON s.id = b.student_id ${dateCondition}
      LEFT JOIN behavior_types bt ON b.behavior_type = bt.name
      WHERE s.grade IN ('高一', '高二', '高三') ${gradeCondition} ${classCondition}
    `;

    // 获取年级违纪率数据
    const violationRateQuery = `
      WITH GradeStats AS (
        SELECT 
          COALESCE(s.grade, '未知') as grade,
          COUNT(DISTINCT s.id) as total_students,
          COUNT(DISTINCT CASE WHEN bt.category = '违纪' THEN b.student_id END) as violation_students
        FROM students s
        LEFT JOIN behaviors b ON s.id = b.student_id ${dateCondition}
        LEFT JOIN behavior_types bt ON b.behavior_type = bt.name
        WHERE s.grade IN ('高一', '高二', '高三') ${gradeCondition} ${classCondition}
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

    // 获取班级违纪情况分析
    const classViolationQuery = `
      WITH ClassStats AS (
        SELECT 
          s.grade,
          s.class,
          COUNT(DISTINCT s.id) as total_students,
          COUNT(DISTINCT CASE WHEN bt.category = '违纪' THEN b.student_id END) as violation_students,
          COUNT(CASE WHEN bt.category = '违纪' THEN b.id END) as violation_count,
          GROUP_CONCAT(DISTINCT CASE WHEN bt.category = '违纪' THEN bt.name END) as violation_types
        FROM students s
        LEFT JOIN behaviors b ON s.id = b.student_id ${dateCondition}
        LEFT JOIN behavior_types bt ON b.behavior_type = bt.name
        WHERE s.grade IN ('高一', '高二', '高三') ${gradeCondition} ${classCondition}
        GROUP BY s.grade, s.class
      )
      SELECT 
        grade,
        class,
        total_students,
        violation_students,
        violation_count,
        ROUND(COALESCE(violation_students * 100.0 / NULLIF(total_students, 0), 0), 2) as violation_rate,
        ROUND(COALESCE(violation_count * 1.0 / NULLIF(violation_students, 0), 0), 2) as avg_violations_per_student,
        violation_types
      FROM ClassStats
      ORDER BY 
        CASE grade
          WHEN '高一' THEN 1
          WHEN '高二' THEN 2
          WHEN '高三' THEN 3
          ELSE 4
        END,
        violation_count DESC
    `;

    // 获取月度违纪率趋势
    const monthlyTrendQuery = `
      WITH MonthlyStats AS (
        SELECT 
          strftime('%Y-%m', COALESCE(b.date, date('now'))) as month,
          COUNT(DISTINCT s.id) as total_students,
          COUNT(DISTINCT CASE WHEN bt.category = '违纪' THEN b.student_id END) as violation_students
        FROM students s
        LEFT JOIN behaviors b ON s.id = b.student_id ${dateCondition}
        LEFT JOIN behavior_types bt ON b.behavior_type = bt.name
        WHERE s.grade IN ('高一', '高二', '高三') ${gradeCondition} ${classCondition}
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

    // 执行查询
    try {
      // 获取违纪类型趋势数据
      const violationTypeTrendQuery = `
      SELECT 
          strftime('%Y-%m', b.date) as month,
          b.behavior_type as type,
          COUNT(*) as count
        FROM behaviors b
        JOIN students s ON b.student_id = s.id
        JOIN behavior_types bt ON b.behavior_type = bt.name
        WHERE bt.category = '违纪' 
          AND s.grade IN ('高一', '高二', '高三') 
          ${dateCondition} ${gradeCondition} ${classCondition}
        GROUP BY strftime('%Y-%m', b.date), b.behavior_type
        ORDER BY month, type
      `;

      // 获取学生违纪频次分布
      const studentViolationDistQuery = `
        WITH FilteredStudents AS (
          -- 首先获取符合筛选条件的学生
          SELECT s.id
      FROM students s
          WHERE 1=1 ${gradeCondition} ${classCondition}
        ),
        ViolationCounts AS (
          -- 统计每个学生的违纪次数
          SELECT 
            fs.id as student_id,
            COUNT(CASE WHEN bt.category = '违纪' THEN b.id END) as violation_times
          FROM FilteredStudents fs
          LEFT JOIN behaviors b ON fs.id = b.student_id ${dateCondition}
      LEFT JOIN behavior_types bt ON b.behavior_type = bt.name
          GROUP BY fs.id
        ),
        FrequencyGroups AS (
          -- 按违纪次数分组统计
          SELECT
            CASE 
              WHEN violation_times >= 5 THEN 5
              ELSE violation_times 
            END as times,
            COUNT(*) as count
          FROM ViolationCounts
          GROUP BY 
            CASE 
              WHEN violation_times >= 5 THEN 5
              ELSE violation_times 
            END
        )
        SELECT 
          fg.times,
          fg.count,
          ROUND(CAST(fg.count AS FLOAT) * 100.0 / (
            SELECT COUNT(*) FROM FilteredStudents
          ), 2) as percentage
        FROM FrequencyGroups fg
        ORDER BY fg.times
      `;

      // 获取违纪时段分布
      const timeDistributionQuery = `
        SELECT 
          CASE 
            WHEN strftime('%H', b.date) BETWEEN '06' AND '12' THEN 'morning'
            WHEN strftime('%H', b.date) BETWEEN '12' AND '18' THEN 'afternoon'
            ELSE 'evening'
          END as time_period,
          COUNT(*) as count
        FROM behaviors b
        JOIN behavior_types bt ON b.behavior_type = bt.name
        JOIN students s ON b.student_id = s.id
        WHERE bt.category = '违纪' 
          AND s.grade IN ('高一', '高二', '高三')
          ${dateCondition} ${gradeCondition} ${classCondition}
        GROUP BY 
          CASE 
            WHEN strftime('%H', b.date) BETWEEN '06' AND '12' THEN 'morning'
            WHEN strftime('%H', b.date) BETWEEN '12' AND '18' THEN 'afternoon'
            ELSE 'evening'
          END
    `;

      // 获取违纪原因分析
      const reasonAnalysisQuery = `
        SELECT 
          b.behavior_type as reason,
          COUNT(*) as count
        FROM behaviors b
        JOIN behavior_types bt ON b.behavior_type = bt.name
        JOIN students s ON b.student_id = s.id
        WHERE bt.category = '违纪' 
          AND s.grade IN ('高一', '高二', '高三')
          ${dateCondition} ${gradeCondition} ${classCondition}
        GROUP BY b.behavior_type
        ORDER BY count DESC
        LIMIT 10
      `;

      // 获取违纪类型分布
      const violationTypeDistQuery = `
        WITH TypeStats AS (
          SELECT 
            bt.name as type_name,
            COUNT(*) as count
          FROM behaviors b
          JOIN behavior_types bt ON b.behavior_type = bt.name
          JOIN students s ON b.student_id = s.id
          WHERE bt.category = '违纪'
            ${dateCondition} ${gradeCondition} ${classCondition}
          GROUP BY bt.name
        ),
        TotalViolations AS (
          SELECT SUM(count) as total FROM TypeStats
        )
        SELECT 
          ts.type_name,
          ts.count,
          ROUND(CAST(ts.count AS FLOAT) * 100.0 / CAST((SELECT total FROM TotalViolations) AS FLOAT), 2) as percentage
        FROM TypeStats ts
        ORDER BY ts.count DESC
      `;

      // 执行所有查询
      console.info('开始执行查询...');
      
      const results = await Promise.all([
        get(totalStatsQuery, params).catch(err => {
          console.error('总体统计查询失败:', err);
          return [{}];
        }),
        get(violationRateQuery, params).catch(err => {
          console.error('违纪率查询失败:', err);
          return [];
        }),
        get(classViolationQuery, params).catch(err => {
          console.error('班级违纪查询失败:', err);
          return [];
        }),
        get(monthlyTrendQuery, params).catch(err => {
          console.error('月度趋势查询失败:', err);
          return [];
        }),
        get(violationTypeTrendQuery, params).catch(err => {
          console.error('违纪类型趋势查询失败:', err);
          return [];
        }),
        get(studentViolationDistQuery, params).catch(err => {
          console.error('学生违纪频次查询失败:', err);
          return [];
        }),
        get(timeDistributionQuery, params).catch(err => {
          console.error('时段分布查询失败:', err);
          return [];
        }),
        get(reasonAnalysisQuery, params).catch(err => {
          console.error('原因分析查询失败:', err);
          return [];
        }),
        get(violationTypeDistQuery, params).catch(err => {
          console.error('违纪类型分布查询失败:', err);
          return [];
        })
      ]);

      const [
        totalStats,
        violationRates,
        classViolations,
        monthlyTrends,
        violationTypeTrends,
        studentViolationDist,
        timeDistribution,
        reasonAnalysis,
        violationTypeDist
      ] = results;

      console.info('所有查询执行完成');

      // 处理时段分布数据
      const timeDistObj = timeDistribution.reduce((acc, curr) => {
        acc[curr.time_period] = curr.count;
        return acc;
      }, {});

      // 处理班级违纪数据分析
      const classAnalysis = {
        summary: {
          total_classes: classViolations.length,
          classes_with_violations: classViolations.filter(c => c.violation_count > 0).length,
          highest_violation_rate: Math.max(...classViolations.map(c => c.violation_rate || 0)),
          lowest_violation_rate: Math.min(...classViolations.map(c => c.violation_rate || 0))
        },
        by_grade: {},
        rankings: {
          top_violation_rate: classViolations
            .sort((a, b) => (b.violation_rate || 0) - (a.violation_rate || 0))
            .slice(0, 5),
          top_violation_count: classViolations
            .sort((a, b) => (b.violation_count || 0) - (a.violation_count || 0))
            .slice(0, 5)
        }
      };

      // 按年级分组统计
      classViolations.forEach(cls => {
        if (!classAnalysis.by_grade[cls.grade]) {
          classAnalysis.by_grade[cls.grade] = {
            classes: [],
            avg_violation_rate: 0,
            total_violations: 0
          };
        }
        classAnalysis.by_grade[cls.grade].classes.push(cls);
        classAnalysis.by_grade[cls.grade].total_violations += cls.violation_count || 0;
      });

      // 计算每个年级的平均违纪率
      Object.keys(classAnalysis.by_grade).forEach(grade => {
        const gradeData = classAnalysis.by_grade[grade];
        gradeData.avg_violation_rate = gradeData.classes.reduce((sum, cls) => sum + (cls.violation_rate || 0), 0) / gradeData.classes.length;
      });

    // 准备返回数据
    const responseData = {
        totalStudents: totalStats[0]?.total_students || 0,
        totalViolationStudents: totalStats[0]?.violation_students || 0,
        totalViolations: totalStats[0]?.total_violations || 0,
        totalViolationRate: totalStats[0]?.total_violation_rate || 0,
      gradeViolationRates: violationRates,
        monthlyTrends: monthlyTrends,
        classAnalysis: classAnalysis,
        violationTypeTrends: violationTypeTrends,
        studentViolationDist: studentViolationDist,
        timeDistribution: {
          morning: timeDistObj.morning || 0,
          afternoon: timeDistObj.afternoon || 0,
          evening: timeDistObj.evening || 0
        },
        reasonAnalysis: reasonAnalysis,
        violationTypeDist: violationTypeDist
    };

      console.info('数据处理完成，准备返回');
    res.json(responseData);
    } catch (error) {
      console.error('统计分析失败:', {
        message: error.message,
        stack: error.stack,
        sql: error.sql,
        sqlMessage: error.sqlMessage
      });
      next(error);
    }

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

// 获取年级和班级信息
router.get('/class-info', authenticateToken, async (req, res, next) => {
  try {
    console.info('=== 开始获取年级和班级信息 ===');

    // 获取所有年级和班级信息，包括双优班
    const query = `
      SELECT DISTINCT 
        grade,
        class as class_display,
        CASE 
          WHEN class = '双优' THEN '双优'
          ELSE class
        END as class_value
      FROM students
      WHERE grade IN ('高一', '高二', '高三')
      ORDER BY 
        CASE grade
          WHEN '高一' THEN 1
          WHEN '高二' THEN 2
          WHEN '高三' THEN 3
          ELSE 4
        END,
        CASE 
          WHEN class = '双优' THEN 0
          ELSE CAST(class AS INTEGER)
        END
    `;

    const results = await get(query);
    console.info('查询结果:', results);
    
    // 处理结果
    const classInfo = results.reduce((acc, curr) => {
      if (!acc[curr.grade]) {
        acc[curr.grade] = [];
      }
      // 将班级信息转换为对象格式，包含显示值和实际值
      acc[curr.grade].push({
        label: curr.class_display,
        value: curr.class_value
      });
      return acc;
    }, {});

    console.info('年级和班级信息获取成功:', classInfo);
    res.json(classInfo);

  } catch (error) {
    console.error('获取年级和班级信息失败:', {
      message: error.message,
      stack: error.stack,
      sql: error.sql,
      sqlMessage: error.sqlMessage
    });
    next(error);
  }
});

// 获取学生违纪高风险预警数据
router.get('/risk-warning', authenticateToken, async (req, res, next) => {
  try {
    console.info('=== 开始获取学生违纪高风险预警数据 ===');
    const { days = 30 } = req.query; // 默认分析最近30天的数据
    console.info('分析天数:', days);

    // 计算日期范围
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startDateStr = startDate.toISOString().split('T')[0];
    console.info('开始日期:', startDateStr);

    const riskWarningQuery = `
      WITH RecentViolations AS (
        SELECT 
          s.id as student_id,
          s.name,
          s.grade,
          s.class,
          COUNT(*) as violation_count,
          GROUP_CONCAT(b.behavior_type, ', ') as violation_types,
          MAX(date(b.date)) as latest_violation_date,
          ROUND(CAST(COUNT(*) AS FLOAT) * 30 / ? * 100, 2) as monthly_rate,
          ? as days_range
        FROM students s
        JOIN behaviors b ON s.id = b.student_id
        JOIN behavior_types bt ON b.behavior_type = bt.name
        WHERE bt.category = '违纪'
          AND date(b.date) >= date(?)
        GROUP BY s.id, s.name, s.grade, s.class
        HAVING 
          CASE 
            WHEN days_range = 7 THEN violation_count >= 2
            WHEN days_range = 30 THEN violation_count >= 10
            ELSE violation_count >= 2
          END
      )
      SELECT 
        rv.*,
        CASE
          WHEN days_range = 7 AND violation_count >= 5 THEN '高'
          WHEN days_range = 7 AND violation_count >= 3 THEN '中'
          WHEN days_range = 7 AND violation_count >= 2 THEN '低'
          WHEN days_range = 30 AND violation_count >= 20 THEN '高'
          WHEN days_range = 30 AND violation_count >= 15 THEN '中'
          WHEN days_range = 30 AND violation_count >= 10 THEN '低'
          ELSE '低'
        END as risk_level
      FROM RecentViolations rv
      ORDER BY 
        CASE risk_level
          WHEN '高' THEN 1
          WHEN '中' THEN 2
          WHEN '低' THEN 3
        END,
        violation_count DESC,
        latest_violation_date DESC
      LIMIT 20
    `;

    const params = [days, days, startDateStr];
    console.info('查询参数:', params);

    // 执行查询
    const riskWarningData = await get(riskWarningQuery, params);
    console.info('查询结果数量:', riskWarningData.length);
    
    if (riskWarningData.length === 0) {
      console.info('未找到符合条件的风险预警数据');
      
      // 执行诊断查询，检查基础数据
      const diagnosticQuery = `
        SELECT 
          COUNT(*) as total_violations,
          COUNT(DISTINCT b.student_id) as total_students,
          MIN(date(b.date)) as earliest_date,
          MAX(date(b.date)) as latest_date
        FROM behaviors b
        JOIN behavior_types bt ON b.behavior_type = bt.name
        WHERE bt.category = '违纪'
      `;
      
      const [diagnosticData] = await get(diagnosticQuery);
      console.info('诊断数据:', diagnosticData);
    }

    // 为每个学生添加风险等级对应的样式
    const riskWarningWithStyles = riskWarningData.map(student => ({
      ...student,
      risk_style: {
        color: student.risk_level === '高' ? '#FF4D4F' :
               student.risk_level === '中' ? '#FAAD14' : '#52C41A',
        backgroundColor: student.risk_level === '高' ? '#FFF1F0' :
                        student.risk_level === '中' ? '#FFF7E6' : '#F6FFED'
      }
    }));

    console.info('处理后的数据示例:', 
      riskWarningWithStyles.length > 0 ? riskWarningWithStyles[0] : '无数据');
    
    res.json(riskWarningWithStyles);

  } catch (error) {
    console.error('获取风险预警数据失败:', {
      message: error.message,
      stack: error.stack,
      sql: error.sql,
      sqlMessage: error.sqlMessage
    });
    next(error);
  }
});

// 辅助函数：验证日期格式
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = router; 