const db = require('../models/db');
const moment = require('moment');

// 获取教师分数明细
const getTeacherScoreDetails = async (req, res) => {
    try {
        const { teacher_name, month } = req.query;
        
        if (!teacher_name || !month) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        // 获取月份的起始和结束时间
        const startDate = moment(month).startOf('month').format('YYYY-MM-DD HH:mm:ss');
        const endDate = moment(month).endOf('month').format('YYYY-MM-DD HH:mm:ss');

        // 查询学生行为记录
        const studentBehaviors = await db.all(`
            SELECT 
                b.date,
                s.grade,
                s.class,
                s.name as student_name,
                b.behavior_type,
                b.behavior_score as score_change,
                b.description
            FROM behaviors b
            JOIN students s ON b.student_name = s.name
            WHERE s.teacher = ? 
            AND b.date BETWEEN ? AND ?
            ORDER BY b.date DESC
        `, [teacher_name, startDate, endDate]);

        // 查询教师行为记录
        const teacherBehaviors = await db.all(`
            SELECT 
                date,
                teacher_name as student_name,
                behavior_type,
                score as score_change,
                description,
                grade,
                class
            FROM teacher_behaviors
            WHERE teacher_name = ? 
            AND date BETWEEN ? AND ?
            ORDER BY date DESC
        `, [teacher_name, startDate, endDate]);

        // 合并两种记录并按时间排序
        const allBehaviors = [...studentBehaviors, ...teacherBehaviors]
            .sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());

        res.json(allBehaviors);
    } catch (error) {
        console.error('获取教师分数明细失败:', error);
        res.status(500).json({ error: '获取教师分数明细失败' });
    }
};

module.exports = {
    getTeacherScoreDetails
}; 