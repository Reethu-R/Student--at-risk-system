/**
 * ecosystem.config.js
 * PM2 Cluster Mode — uses all CPU cores for 4000+ users
 * Start: pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    {
      name:          'student-risk-api',
      script:        './server.js',
      instances:     'max',         // Use all CPU cores
      exec_mode:     'cluster',     // Cluster mode for load balancing
      watch:         false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV:   'development',
        PORT:       5000,
      },
      env_production: {
        NODE_ENV:   'production',
        PORT:       5000,
      },
      error_file:    './logs/err.log',
      out_file:      './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay:   4000,
      autorestart:     true,
      max_restarts:    10,
    },
  ],
};
