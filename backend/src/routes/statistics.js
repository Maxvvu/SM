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

module.exports = router; 