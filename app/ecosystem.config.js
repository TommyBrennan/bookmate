module.exports = {
  apps: [
    {
      name: 'bookmate',
      script: 'node_modules/.bin/next',
      args: 'start --port 3000',
      cwd: '/root/Projects/bookmate/app',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      // Load .env.local for secrets (SESSION_SECRET, SMTP, etc.)
      env_file: '.env.local',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      // Logging
      error_file: '/root/Projects/bookmate/.claude-beat/logs/pm2-error.log',
      out_file: '/root/Projects/bookmate/.claude-beat/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
