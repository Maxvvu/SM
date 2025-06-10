const { getDatabase } = require('../models/database');
const moment = require('moment');

// 将查询包装为Promise
const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// 获取教师分数明细
const getTeacherScoreDetails = async (req, res) => {
    try {
        const { teacher_name, month } = req.query;
        console.log('接收到的参数:', { teacher_name, month });
        
        if (!teacher_name || !month) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        // 获取月份的起始和结束时间
        const startDate = moment(month).startOf('month').format('YYYY-MM-DD HH:mm:ss');
        const endDate = moment(month).endOf('month').format('YYYY-MM-DD HH:mm:ss');
        console.log('查询时间范围:', { startDate, endDate });

        try {
            // 查询学生行为记录
            const studentBehaviorsQuery = `
                SELECT 
                    b.date,
                    s.grade,
                    s.class,
                    s.name as student_name,
                    b.behavior_type,
                    bt.score as score_change,
                    b.description
                FROM behaviors b
                JOIN students s ON b.student_id = s.id
                JOIN behavior_types bt ON b.behavior_type = bt.name
                WHERE s.teacher = ? 
                AND b.date BETWEEN ? AND ?
                ORDER BY b.date DESC
            `;
            console.log('学生行为查询SQL:', studentBehaviorsQuery);
            const studentBehaviors = await queryAsync(studentBehaviorsQuery, [teacher_name, startDate, endDate]);
            console.log('学生行为查询结果:', studentBehaviors);

            // 查询教师行为记录
            const teacherBehaviorsQuery = `
                SELECT 
                    date,
                    teacher_name as student_name,
                    behavior_type,
                    score as score_change,
                    description,
                    '' as grade,
                    '' as class
                FROM teacher_behaviors
                WHERE teacher_name = ? 
                AND date BETWEEN ? AND ?
                ORDER BY date DESC
            `;
            console.log('教师行为查询SQL:', teacherBehaviorsQuery);
            const teacherBehaviors = await queryAsync(teacherBehaviorsQuery, [teacher_name, startDate, endDate]);
            console.log('教师行为查询结果:', teacherBehaviors);

            // 合并两种记录并按时间排序
            const allBehaviors = [...studentBehaviors, ...teacherBehaviors]
                .sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());

            res.json(allBehaviors);
        } catch (dbError) {
            console.error('数据库查询错误:', dbError);
            throw new Error('数据库查询失败: ' + dbError.message);
        }
    } catch (error) {
        console.error('获取教师分数明细失败:', error);
        res.status(500).json({ 
            error: '获取教师分数明细失败',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    getTeacherScoreDetails
}; 