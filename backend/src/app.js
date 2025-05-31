const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { initDatabase } = require('./models/database');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const behaviorRoutes = require('./routes/behaviors');
const behaviorTypeRoutes = require('./routes/behaviorTypes');
const statisticsRoutes = require('./routes/statistics');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');

const app = express();
const port = 3000;

// 中间件配置
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由配置
app.use('/api', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/behaviors', behaviorRoutes);
app.use('/api/behavior-types', behaviorTypeRoutes);
app.use('/api/statistics', statisticsRoutes);

// 错误处理中间件
app.use(errorHandler);

// 初始化数据库并启动服务器
initDatabase()
  .then(() => {
    app.listen(port, () => {
      logger.info(`服务器运行在 http://localhost:${port}`);
    });
  })
  .catch(err => {
    logger.error('服务器启动失败:', err);
    process.exit(1);
  }); 