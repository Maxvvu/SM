const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { initDatabase } = require('./models/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const behaviorRoutes = require('./routes/behaviors');
const behaviorTypeRoutes = require('./routes/behaviorTypes');
const statisticsRoutes = require('./routes/statistics');
const uploadRoutes = require('./routes/upload');
const logsRoutes =require('./routes/logs')
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const { ensureUploadDirectories } = require('./utils/init');

const app = express();
const port = 3000;

// 确保上传目录存在
ensureUploadDirectories();

// 中间件配置
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 预检请求缓存24小时
}));
app.use(express.json());
app.use(morgan('dev'));

// 静态文件服务 - 需要在API路由之前配置
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API路由配置
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/behaviors', behaviorRoutes);
app.use('/api/behaviorTypes', behaviorTypeRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/logs', logsRoutes);

// 错误处理中间件
app.use(errorHandler);

// 初始化数据库并启动服务器
initDatabase()
  .then(() => {
    app.listen(port, () => {

    });
  })
  .catch(err => {

    process.exit(1);
  }); 