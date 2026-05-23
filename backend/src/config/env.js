const { cleanEnv, str, port } = require('envalid');

function getCorsOrigins(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 4000 }),
  DATABASE_URL: str({ devDefault: 'postgresql://assa:assa@localhost:5432/assa' }),
  JWT_SECRET: str({ devDefault: 'development-only-set-JWT_SECRET-in-env' }),
  JWT_EXPIRES_IN: str({ default: '8h' }),
  JWT_ACCESS_EXPIRES_IN: str({ default: '30m' }),
  REFRESH_TOKEN_DAYS: str({ default: '7' }),
  CORS_ORIGINS: str({ default: 'http://localhost:3001,http://localhost:3002,http://localhost:3003' }),
  CLOUDINARY_URL: str({ default: '', desc: 'Cloudinary connection string' }),
  LOG_LEVEL: str({ default: 'info', desc: 'Logging level threshold' }),
  SESSION_COOKIE_DOMAIN: str({ default: '', desc: 'Domain configuration for cookie storage' }),
});

// Guard against weak secrets in production
if (env.NODE_ENV === 'production') {
  if (
    !env.JWT_SECRET ||
    env.JWT_SECRET === 'change_me' ||
    env.JWT_SECRET.startsWith('development-only-')
  ) {
    throw new Error('CRITICAL CONFIGURATION ERROR: A secure, strong JWT_SECRET must be provided in production environments.');
  }
}

module.exports = {
  env,
  corsOrigins: getCorsOrigins(env.CORS_ORIGINS),
};
