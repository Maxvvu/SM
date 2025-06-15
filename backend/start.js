#!/usr/bin/env node

// 禁用 PM2 的监控功能
process.env.PM2_DISABLE_CLUSTER = 'true';

// 设置环境变量
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// 启动应用
require('./src/app.js'); 