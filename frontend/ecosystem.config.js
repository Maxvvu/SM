module.exports = {
  apps: [
    {
      name: 'sm-frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --port 3000',
      cwd: '/ssd/sm/frontend',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/root/.pm2/logs/sm-frontend-error.log',
      out_file: '/root/.pm2/logs/sm-frontend-out.log',
      log_file: '/root/.pm2/logs/sm-frontend-combined.log',
      time: true
    }
  ]
} 