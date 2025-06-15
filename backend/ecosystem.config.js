module.exports = {
  apps: [{
    name: 'sm-backend',
    script: 'start.js',
    cwd: '/ssd/sm/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      PM2_DISABLE_CLUSTER: 'true'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      PM2_DISABLE_CLUSTER: 'true'
    },
    // 禁用 PM2 的监控功能以避免模块加载问题
    node_args: '--no-warnings --max-old-space-size=1024',
    // 增加内存限制
    max_memory_restart: '1G',
    // 错误日志配置
    error_file: '/root/.pm2/logs/sm-backend-error.log',
    out_file: '/root/.pm2/logs/sm-backend-out.log',
    log_file: '/root/.pm2/logs/sm-backend-combined.log',
    time: true,
    // 重启策略
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    // 优雅关闭
    kill_timeout: 5000,
    listen_timeout: 3000
  }]
}; 