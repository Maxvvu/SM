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
const logsRoutes = require('./routes/logs');
const scoreItemsRoutes = require('./routes/scoreItems');
const teacherBehaviorsRoutes = require('./routes/teacherBehaviors');
const teacherRoutes = require('./routes/teacherRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const { ensureUploadDirectories } = require('./utils/init');
const multer = require('multer');

const app = express();
const port = 3001;

// 确保上传目录存在
ensureUploadDirectories();

// 中间件配置
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://wuxiaoyue.top:3000', 'http://wuxiaoyue.top:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 预检请求缓存24小时
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 静态文件服务 - 需要在API路由之前配置
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 前端静态文件服务
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath, {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// API路由配置
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/behaviors', behaviorRoutes);
app.use('/api/behaviorTypes', behaviorTypeRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/score-items', scoreItemsRoutes);
app.use('/api/teacher-behaviors', teacherBehaviorsRoutes);
app.use('/api/teachers', teacherRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '文件大小不能超过5MB' });
    }
    return res.status(400).json({ message: '文件上传错误' });
  }
  res.status(500).json({ message: '服务器内部错误' });
});

// 处理前端路由
app.get('*', (req, res) => {
  // 检查文件是否存在
  const indexPath = path.join(__dirname, '../../frontend/dist/index.html');
  console.log('尝试访问文件:', indexPath);
  
  // 如果文件不存在，返回一个简单的错误页面
  if (!require('fs').existsSync(indexPath)) {
    console.error('前端文件不存在:', indexPath);
    return res.status(404).send(`
      <html>
        <head>
          <title>404 - 前端文件未找到</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #333; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h1>404 - 前端文件未找到</h1>
          <p>请确保前端文件已正确部署到: ${indexPath}</p>
        </body>
      </html>
    `);
  }
  
  res.sendFile(indexPath);
});

// 初始化数据库并启动服务器
initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`服务器运行在端口 ${port}`);
    });
  })
  .catch(err => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  }); 