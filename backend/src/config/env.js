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
  JWT_SECRET: str({ devDefault: 'development-only-set-JWT_SECRET-in-env' }),
  JWT_EXPIRES_IN: str({ default: '8h' }),
  DB_PATH: str({ default: './src/database/assa.db' }),
  CORS_ORIGINS: str({ default: 'http://localhost:3001,http://localhost:3002,http://localhost:3003' }),
});

module.exports = {
  env,
  corsOrigins: getCorsOrigins(env.CORS_ORIGINS),
};
