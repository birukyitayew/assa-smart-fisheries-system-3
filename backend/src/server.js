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

// ── Middleware ────────────────────────────────────────────────────────────────
app.disable('x-powered-by');
app.set('trust proxy', 1);

const logger = pino({ level: process.env.LOG_LEVEL || (env.NODE_ENV === 'production' ? 'info' : 'debug') });
app.use(pinoHttp({ logger }));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow /uploads assets
}));

if (env.NODE_ENV === 'production') {
  app.use(rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }));
}

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (env.NODE_ENV === 'development' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }
    if (corsOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api',             catchesRoutes);   // /api/catches, /api/fisher/*, /api/notifications, /api/zones
app.use('/api/admin',       adminRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/realtime',    realtimeRoutes);
app.use('/api/inspector',   inspectorRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ASSA Backend',
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res) => {
  req.log?.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'ASSA Backend listening');
});
