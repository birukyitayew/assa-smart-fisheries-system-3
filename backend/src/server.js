require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const pino = require('pino');
const pinoHttp = require('pino-http');

const { env, corsOrigins } = require('./config/env');

const authRoutes        = require('./routes/auth.routes');
const catchesRoutes     = require('./routes/catches.routes');
const adminRoutes       = require('./routes/admin.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const realtimeRoutes    = require('./routes/realtime.routes');
const inspectorRoutes   = require('./routes/inspector.routes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const logger = pino({ level: process.env.LOG_LEVEL || (env.NODE_ENV === 'production' ? 'info' : 'debug') });
app.use(pinoHttp({ logger }));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

if (env.NODE_ENV === 'production') {
  app.use('/api/auth/login', authLimiter);
  app.use('/api', apiLimiter);
}

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (env.NODE_ENV === 'development' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }
    if (corsOrigins.length === 0 && env.NODE_ENV === 'production') {
      return cb(new Error('CORS_ORIGINS must be set in production'), false);
    }
    if (corsOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',        authRoutes);
app.use('/api',             catchesRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/realtime',    realtimeRoutes);
app.use('/api/inspector',   inspectorRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ASSA Backend',
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use((err, req, res, _next) => {
  req.log?.error({ err }, 'Unhandled error');
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'ASSA Backend listening');
});
