#!/bin/bash

# 部署脚本
echo "开始部署后端服务..."

# 设置工作目录
cd /ssd/sm/backend

# 停止当前服务
echo "停止当前服务..."
pm2 stop sm-backend 2>/dev/null || true
pm2 delete sm-backend 2>/dev/null || true

# 清理并重新安装依赖
echo "清理并重新安装依赖..."
rm -rf node_modules package-lock.json
npm install --production

# 设置文件权限
echo "设置文件权限..."
chmod -R 755 node_modules
chmod +x start.js

# 启动服务
echo "启动服务..."
pm2 start ecosystem.config.js --env production

# 保存 PM2 配置
pm2 save

# 显示状态
echo "服务状态："
pm2 status

echo "部署完成！" 