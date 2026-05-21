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
});

module.exports = {
  env,
  corsOrigins: getCorsOrigins(env.CORS_ORIGINS),
};
