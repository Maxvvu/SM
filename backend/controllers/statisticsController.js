const db = require('../models')
const { Op } = require('sequelize')

// 获取统计数据
const getStatistics = async (req, res) => {
  try {
    // 1. 获取年级分布数据
    const gradeStats = await db.sequelize.query(`
      SELECT grade, COUNT(*) as count
      FROM students
      WHERE grade IN ('高一', '高二', '高三')
      GROUP BY grade
    `, {
      type: db.sequelize.QueryTypes.SELECT
    })

    // 格式化年级分布数据
    const gradeDistribution = {
      '高一': 0,
      '高二': 0,
      '高三': 0
    }

    let totalStudents = 0
    gradeStats.forEach(stat => {
      if (stat.grade in gradeDistribution) {
        gradeDistribution[stat.grade] = parseInt(stat.count)
        totalStudents += parseInt(stat.count)
      }
    })

    // 2. 获取行为统计数据
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // 获取本月违规行为统计
    const violationCount = await db.sequelize.query(`
      SELECT COUNT(*) as count
      FROM behaviors b
      JOIN behavior_types bt ON b.behavior_type_id = bt.id
      WHERE bt.category = '违纪'
      AND b.date BETWEEN :startDate AND :endDate
    `, {
      replacements: { startDate: monthStart, endDate: monthEnd },
      type: db.sequelize.QueryTypes.SELECT
    })

    // 获取本月优秀行为统计
    const excellentCount = await db.sequelize.query(`
      SELECT COUNT(*) as count
      FROM behaviors b
      JOIN behavior_types bt ON b.behavior_type_id = bt.id
      WHERE bt.category = '优秀'
      AND b.date BETWEEN :startDate AND :endDate
    `, {
      replacements: { startDate: monthStart, endDate: monthEnd },
      type: db.sequelize.QueryTypes.SELECT
    })

    // 3. 返回统计数据
    res.json({
      totalStudents,
      gradeDistribution,
      behaviorStats: {
        currentMonth: {
          violation: parseInt(violationCount[0]?.count || 0),
          excellent: parseInt(excellentCount[0]?.count || 0)
        }
      }
    })

  } catch (error) {
    console.error('获取统计数据失败:', error)
    res.status(500).json({
      message: '获取统计数据失败',
      error: error.message
    })
  }
}

module.exports = {
  getStatistics
} 