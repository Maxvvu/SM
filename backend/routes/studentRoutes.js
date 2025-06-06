const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const multer = require('multer');
const { storage, fileFilter } = require('../controllers/studentController');

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// 学生导入路由
router.post('/import', upload.single('file'), studentController.importStudents);

// 下载模板路由
router.get('/template', studentController.downloadTemplate);

module.exports = router; 