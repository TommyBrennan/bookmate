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
      // Restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // Exponential backoff for crashes
      exp_backoff_restart_delay: 100,
      // Logging with rotation
      error_file: '/root/Projects/bookmate/.claude-beat/logs/pm2-error.log',
      out_file: '/root/Projects/bookmate/.claude-beat/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Rotate logs when they reach 10MB, keep 5 archived files
      log_file_pattern: '/root/Projects/bookmate/.claude-beat/logs/pm2-<name>-<pid>.log',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      wait_ready: false,
      shutdown_with_message: false,
    },
  ],
};
