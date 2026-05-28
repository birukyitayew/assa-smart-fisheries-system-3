# ASSA Uptime Monitoring & Production Operations

This document outlines the setup, architecture, and configuration for production-grade uptime monitoring, status checks, and keepalive configurations for the ASSA Smart Fisheries System.

---

## 1. System Health Monitoring Endpoints

The API backend exposes two dedicated endpoints for health and monitoring systems:

### Simple Health Check

- **Endpoint**: `GET /api/health`
- **Response Status**: `200 OK`
- **Payload**:
  ```json
  {
    "status": "ok",
    "service": "ASSA Backend",
    "env": "production",
    "timestamp": "2026-05-24T02:00:00.000Z"
  }
  ```
- **Use Case**: Edge load balancers, CDN active path routing, and basic ping monitoring (e.g. UptimeRobot, Pingdom).

### Detailed Deep Health Check

- **Endpoint**: `GET /api/health/detailed`
- **Response Status**: `200 OK` (or `503 Service Unavailable` if database is down)
- **Payload**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-05-24T02:00:00.000Z",
    "uptime": 12845.23,
    "memory": {
      "rss": 45678912,
      "heapTotal": 23456789,
      "heapUsed": 12345678,
      "external": 123456
    },
    "db": "connected",
    "storage": "cloudinary"
  }
  ```
- **Use Case**: Deep synthetics, Grafana, Datadog agents, or custom operation dashboards verifying connection health to database and third-party integrations.

---

## 2. UptimeRobot / Pingdom Setup Guide

To ensure high availability and keep-alive verification:

1. **Service Registration**:
   - Create an HTTP(S) monitor pointing to: `https://assa-api.onrender.com/api/health`
   - Set monitoring interval to **every 5 minutes** (keep-alive safe).
   - **Keep-Alive Note**: On a free/hobby server plan, this regular check prevents the application container from going to sleep.

2. **Database Synthetics**:
   - Create a second, less frequent monitor (e.g., every 15 minutes) pointing to: `https://assa-api.onrender.com/api/health/detailed`
   - Alert on status codes other than `200 OK`. This acts as an active probe verifying that the database connection pool hasn't exhausted or leaked.

---

## 3. Sentry Integration Setup

ASSA has native hooks ready for Sentry error tracking and performance profiling:

### Backend Integration

To initialize Sentry in backend production:

1. Install dependencies:
   ```bash
   npm install @sentry/node @sentry/profiling-node
   ```
2. Inject into `server.js` at the top:
   ```javascript
   const Sentry = require('@sentry/node');
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
   });
   ```

### Frontend Integration (React SPA)

1. Install frontend packages:
   ```bash
   npm install @sentry/react
   ```
2. Initialize in `main.jsx` for all three frontends:
   ```javascript
   import * as Sentry from '@sentry/react';
   Sentry.init({
     dsn: import.meta.env.VITE_SENTRY_DSN,
     environment: import.meta.env.MODE,
     tracesSampleRate: 0.1,
   });
   ```
