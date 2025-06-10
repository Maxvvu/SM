const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');

// 获取教师分数明细
router.get('/score-details', teacherController.getTeacherScoreDetails);

module.exports = router; 