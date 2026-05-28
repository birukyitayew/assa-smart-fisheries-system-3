require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const pino = require('pino');
const pinoHttp = require('pino-http');
const crypto = require('crypto');

const { env, corsOrigins } = require('./config/env');
const { prisma } = require('./database/prisma');

const authRoutes = require('./routes/auth.routes');
const catchesRoutes = require('./routes/catches.routes');
const adminRoutes = require('./routes/admin.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const realtimeRoutes = require('./routes/realtime.routes');
const inspectorRoutes = require('./routes/inspector.routes');
const securityAssistantRoutes = require('./routes/securityAssistant.routes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const logger = require('./utils/logger');

// Trace correlation middleware: unique ID per request
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customLogLevel: (res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  }),
);

// Production Helmet config with strict CSP & HSTS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: [
          "'self'",
          'data:',
          'https://res.cloudinary.com',
          'https://*.tile.openstreetmap.org',
        ],
        connectSrc: ["'self'", 'https://api.cloudinary.com'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// Always-on request limits, scaled by environment
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'production' ? 15 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.NODE_ENV === 'production' ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api', apiLimiter);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (
        env.NODE_ENV === 'development' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return cb(null, true);
      }
      if (corsOrigins.length === 0 && env.NODE_ENV === 'production') {
        return cb(new Error('CORS_ORIGINS must be set in production'), false);
      }
      if (corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Cloudinary image store vs disk static fallback check
if (process.env.CLOUDINARY_URL) {
  logger.info('Cloudinary configured as cloud image store.');
} else {
  logger.warn('WARNING: CLOUDINARY_URL not set. Falling back to local static uploads.');
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

app.use('/api/auth', authRoutes);
app.use('/api', catchesRoutes);
app.use('/api/admin/security-assistant', securityAssistantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/inspector', inspectorRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ASSA Backend',
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get(
  '/api/health/detailed',
  require('./middleware/auth.middleware'),
  require('./middleware/role.middleware')('admin', 'superadmin'),
  async (req, res) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      db: 'unknown',
      storage: process.env.CLOUDINARY_URL ? 'cloudinary' : 'local-disk',
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      health.db = 'connected';
    } catch {
      health.status = 'error';
      health.db = 'unreachable';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  },
);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use((err, req, res, _next) => {
  req.log?.error({ err }, 'Unhandled error');
  const status = err.status || 500;
  const message =
    status < 500 || env.NODE_ENV === 'development'
      ? err.message || 'Internal server error'
      : 'Internal server error';
  res.status(status).json({ error: message });
});

let server;
if (require.main === module) {
  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'ASSA Backend listening');
  });
}

const gracefulShutdown = (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      prisma
        .$disconnect()
        .then(() => {
          logger.info('Database connection closed');
          process.exit(0);
        })
        .catch((err) => {
          logger.error({ err }, 'Error closing database connection');
          process.exit(1);
        });
    });
  } else {
    prisma.$disconnect().then(() => process.exit(0));
  }

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server };
