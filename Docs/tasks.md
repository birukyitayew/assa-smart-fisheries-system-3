# Implementation Plan: ASSA Smart Fisheries System

## Overview

This implementation plan breaks down the ASSA Smart Fisheries System into actionable tasks organized by implementation phases. The system consists of three interconnected frontend modules (Fisher App, Admin Dashboard, Marketplace) sharing a unified backend API with real-time state propagation via Server-Sent Events.

**Development Timeline**: 5 weeks

- Week 1: Foundation (Infrastructure + Backend Core)
- Week 2: Core Features (All three frontends in parallel)
- Week 3: Interconnection (Real-time SSE + Critical transactions)
- Week 4: Completeness (Testing + Security)
- Week 5: QA (Performance + Documentation + Deployment)

**Team Structure**:

- Full-Stack Lead (Backend + Integration)
- 3 Frontend Developers (Fisher App, Admin Dashboard, Marketplace)
- Product/Design Lead (UX + Testing)

**Technology Stack**: Node.js/Express, PostgreSQL, Redis, React/TypeScript, Tailwind CSS, Cloudinary

## Tasks

### Phase 1: Project Setup & Infrastructure

- [x] 1.1 Initialize monorepo structure and development environment
  - Create root directory with apps/ and packages/ folders
  - Initialize package.json with workspace configuration
  - Set up TypeScript configuration for monorepo
  - Create .gitignore with Node.js, IDE, and environment file exclusions
  - _Requirements: 26.1, 26.2_
  - _Complexity: Small_
  - _Assigned to: Full-Stack Lead_

- [x] 1.2 Create Docker Compose configuration for local development
  - Define docker-compose.yml with postgres, redis, backend, fisher-app, admin-dashboard, marketplace services
  - Configure PostgreSQL 15 service with persistent volume and health checks
  - Configure Redis 7 service with persistent volume and health checks
  - Set up service networking and port mappings (backend:5000, fisher-app:3002, admin-dashboard:3001, marketplace:3003)
  - Create .env.example with all required environment variables
  - _Requirements: 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8, 26.9, 26.10_
  - _Complexity: Medium_
  - _Assigned to: Full-Stack Lead_

- [x] 1.3 Set up backend project structure with Express and TypeScript
  - Initialize apps/backend with package.json and TypeScript configuration
  - Install dependencies: express, typescript, @types/node, @types/express, ts-node-dev
  - Create src/ folder structure: routes/, services/, middleware/, db/, utils/
  - Set up Express application entry point (src/index.ts) with basic server configuration
  - Configure hot reload for development using ts-node-dev
  - _Requirements: 26.2_
  - _Complexity: Small_
  - _Assigned to: Full-Stack Lead_

- [-] 1.4 Configure database connection with Drizzle ORM
  - Install Drizzle ORM dependencies: drizzle-orm, drizzle-kit, pg
  - Create database configuration file (src/db/config.ts) with connection pool settings
  - Configure connection pooling with min 10, max 50 connections
  - Set up Drizzle Kit configuration for migrations
  - Test database connection and log connection status
  - _Requirements: 15.1, 19.8_
  - _Complexity: Small_
  - _Assigned to: Full-Stack Lead_

- [~] 1.5 Define database schema with Drizzle ORM
  - Create schema files for all tables: users, fishers, boats, catches, listings, orders, species, zones, quotas, notifications, alerts, audit_logs, refresh_tokens
  - Define ENUM types: user_role, catch_status, listing_status, order_status, alert_severity, notification_type
  - Define foreign key relationships with CASCADE and RESTRICT delete rules
  - Define CHECK constraints for weight, price, quantity validations
  - Define UNIQUE constraints for email, license_number, catch_id
  - Define indexes on frequently queried columns
  - Create composite indexes for complex queries
  - _Requirements: 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10, 15.11, 15.12, 15.14_
  - _Complexity: Large_
  - _Assigned to: Full-Stack Lead_

- [~] 1.6 Create database migration scripts and triggers
  - Generate initial migration from Drizzle schema
  - Create trigger function for auto-updating updated_at timestamps
  - Apply trigger to all tables with updated_at column
  - Create trigger to prevent audit log modification and deletion
  - Test migration execution and rollback
  - _Requirements: 15.13_
  - _Complexity: Medium_
  - _Assigned to: Full-Stack Lead_

- [~] 1.7 Create comprehensive seed data script
  - Create seed script with 6 fish species (Tilapia, Catfish, Barbus, Labeobarbus, Clarias, Oreochromis)
  - Create 6 fishing zones for Lake Tana with realistic coordinates
  - Create default quota records for each species
  - Create 3 admin users (admin, super_admin, field_officer) with hashed passwords
  - Create 50 fisher users with Ethiopian names, valid licenses, and boat records
  - Create 200 catch records (150 approved, 30 pending, 20 rejected) with realistic data
  - Create 30 marketplace listings linked to approved catches
  - Create 50 order records with varied statuses
  - Create 100 notification records and 20 alert records
  - Make script idempotent to prevent duplicate data on re-run
  - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 24.9, 24.10, 24.11, 24.12, 24.13, 24.14_
  - _Complexity: Large_
  - _Assigned to: Full-Stack Lead_

- [-] 1.8 Set up Redis connection and caching utilities
  - Install Redis client: ioredis
  - Create Redis connection configuration (src/db/redis.ts)
  - Implement cache utility functions: get, set, del, invalidate
  - Configure TTL values for different cache types
  - Implement graceful fallback when Redis is unavailable
  - Test Redis connection and basic operations
  - _Requirements: 18.1, 18.11, 18.13_
  - _Complexity: Medium_
  - _Assigned to: Full-Stack Lead_

- [-] 1.9 Configure Cloudinary for photo storage
  - Install Cloudinary SDK: cloudinary
  - Create Cloudinary configuration (src/utils/cloudinary.ts)
  - Configure automatic image optimization and WebP transformation
  - Implement photo upload utility function
  - Test photo upload and URL generation
  - _Requirements: 17.4, 17.5, 17.11_
  - _Complexity: Small_
  - _Assigned to: Full-Stack Lead_

- [~] 1.10 Checkpoint - Verify infrastructure setup
  - Run docker-compose up and verify all services start successfully
  - Execute database migrations and verify schema creation
  - Run seed data script and verify data population
  - Test Redis connection and cache operations
  - Test Cloudinary photo upload
  - Ensure all tests pass, ask the user if questions arise.
  - _Complexity: Small_
  - _Assigned to: Full-Stack Lead_

### Phase 2: Backend Core - Authentication & Middleware

- [~] 2.1 Implement authentication service with JWT and refresh tokens
  - Install dependencies: jsonwebtoken, bcrypt, cookie-parser
  - Create authentication service (src/services/auth.service.ts)
  - Implement password hashing with bcrypt cost factor 12
  - Implement JWT token generation with HS256 algorithm, 15-minute expiration
  - Implement refresh token generation as 64-character random string, 7-day expiration
  - Create functions for token validation and refresh
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_
  - _Complexity: Large_
  - _Assigned to: Full-Stack Lead_

- [~] 2.2 Create authentication middleware for protected routes
  - Create auth middleware (src/middleware/auth.middleware.ts)
  - Implement JWT token extraction from Authorization header
  - Implement token signature and expiration validation
  - Attach user information to request object
  - Return HTTP 401 for invalid or expired tokens
  - _Requirements: 21.9_
  - _Complexity: Medium_
  - _Assigned to: Full-Stack Lead_

- [~] 2.3 Create role-based authorization middleware
  - Create authorization middleware (src/middleware/authorize.middleware.ts)
  - Implement role checking based on JWT claims
  - Support multiple allowed roles per endpoint
  - Return HTTP 403 for insufficient permissions
  - Implement row-level security checks for regional admins
  - _Requirements: 5.4, 5.5, 5.6, 5.7_
  - _Complexity: Medium_
  - _Assigned to: Full-Stack Lead_

- [~] 2.4 Implement input validation middleware with Zod
  - Install Zod: zod
  - Create validation middleware (src/middleware/validation.middleware.ts)
  - Define Zod schemas for all request bodies
  - Implement validation for email format, password strength, numeric ranges
  - Return HTTP 400 with field-level error messages for validation failures
  - Sanitize string inputs to prevent SQL injection and XSS
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_
  - _Complexity: Large_
  - _Assigned to: Full-Stack Lead_

- [~] 2.5 Create error handling middleware
  - Create error handler middleware (src/middleware/error.middleware.ts)
  - Implement centralized error handling for all routes
  - Map error types to appropriate HTTP status codes
  - Return generic error messages for 500 errors
  - Log all errors with stack trace and request context
  - Ensure sensitive information is not exposed in error messages
  - _Requirements: 20.9, 20.10, 20.11, 20.12, 20.13, 20.14, 20.15_
  - _Complexity: Medium_
  - _Assigned to: Full-Stack Lead_

- [~] 2.6 Implement request logging middleware with Winston
  - Install Winston: winston, winston-daily-rotate-file
  - Create logging configuration (src/utils/logger.ts)
  - Configure log levels: error, warn, info, debug
  - Implement request logging with method, path, status, response time, user ID, IP
  - Configure daily log rotation with 20MB max size, 14-day retention
  - Ensure passwords, tokens, and personal data are not logged
  - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.9, 25.12_
  - _Complexity: Medium_
  - _Assigned to: Full-Stack Lead_

- [~] 2.7 Implement security middleware (CORS, rate limiting, security headers)
  - Install dependencies: cors, express-rate-limit, helmet
  - Configure CORS to allow only configured frontend origins
  - Implement rate limiting: 100 requests per 15 minutes per IP
  - Set security headers using Helmet: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Strict-Transport-Security
  - Implement account lockout after 5 failed login attempts
  - _Requirements: 21.10, 21.11, 21.12, 21.14_
  - _Complexity: Medium_
  - _Assigned to: Full-Stack Lead_

- [~] 2.8 Checkpoint - Test authentication and middleware
  - Test JWT token generation and validation
  - Test refresh token flow
  - Test role-based authorization
  - Test input validation with various invalid inputs
  - Test error handling for different error types
  - Test rate limiting
  - Ensure all tests pass, ask the user if questions arise.
  - _Complexity: Small_
  - _Assigned to: Full-Stack Lead_

### Phase 3: Backend Core - API Endpoints

- [~] 3.1 Implement authentication API endpoints
  - Create auth routes (src/routes/auth.routes.ts)
  - POST /api/v1/auth/login - Accept email/licenseNumber and password, return JWT and set refresh token cookie
  - POST /api/v1/auth/refresh - Validate refresh token from cookie, return new JWT
  - POST /api/v1/auth/logout - Invalidate refresh token and clear cookie
  - Implement audit logging for all authentication events
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.10, 5.1, 5.2, 5.3, 22.1_
  - _Complexity: Large_
  - _Assigned to: Full-Stack Lead_

- [~] 3.2 Implement fisher profile and catch submission endpoints
  - Create fisher routes (src/routes/fisher.routes.ts)
  - GET /api/v1/fisher/profile - Return authenticated fisher's profile with license and boat info
  - POST /api/v1/fisher/catches - Create catch submission with validation, photo upload, and transaction
  - GET /api/v1/fisher/catches - Return fisher's catch history with pagination and status filter
  - Implement row-level security to ensure fishers only access their own data
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 1.9_
  - _Complexity: Large_
  - _Assigned to: Full-Stack Lead_

- [~] 3.3 Implement fisher notification endpoints
  - Create notification routes for fishers (src/routes/fisher.routes.ts)
  - GET /api/v1/fisher/notifications - Return fisher's notifications with unread count and pagination
  - PATCH /api/v1/fisher/notifications/:id/read - Mark notification as read
  - Implement row-level security for notifications
  - _Requirements: 4.3, 4.4, 4.6, 4.7, 4.8_
  - _Complexity: Medium_
  - _Assigned to: Full-Stack Lead_

- [~] 3.4 Implement admin dashboard KPI and analytics endpoints
  - Create admin routes (src/routes/admin.routes.ts)
  - GET /api/v1/admin/dashboard/kpis - Return KPI metrics with date range filter
  - Calculate: total catches today, pending approvals, approved today, rejected today
  - Calculate catches by species and zone for charts
  - Implement Redis caching with 300-second TTL
  - Return data within 400ms at p95
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.12, 18.2, 19.1_
  - _Complexity: Large_
  - _Assigned to: Full-Stack Lead_

- [~] 3.5 Implement admin catch management endpoints
  - Create catch management routes (src/routes/admin.routes.ts)
  - GET /api/v1/admin/catches - Return all catches with filters (status, species, zone, fisher, date range) and pagination
  - GET /api/v1/admin/catches/:id - Return detailed catch information with fisher and license details
  - Implement row-level security for regional admins
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 5.6_
  - _Complexity: Large_
  - _Assigned to: Full-Stack Lead_

- [~] 3.6 Implement admin catch approval and rejection endpoints
  - Create approval/rejection routes (src/routes/admin.routes.ts)
  - PATCH /api/v1/admin/catches/:id/approve - Approve catch within transaction (update status, create listing, create notification, update quota)
  - PATCH /api/v1/admin/catches/:id/reject - Reject catch within transaction (update status, store reason, create notification)
  - Validate rejection reason minimum 10 characters
  - Implement audit logging for all approval/rejection actions
  - _Requirements: 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.13, 6.14, 16.1, 16.2, 22.2_
  - _Complexity: Large_
  - _Assigned to: Full-Stack Lead_

- [~] 3.7 Implement admin quota monitoring endpoints
  - Create quota routes (src/routes/admin.routes.ts)
  - GET /api/v1/admin/quotas - Return all species quotas with consumption percentage and status
  - Calculate quota status: safe (0-70%), warning (71-90%), critical (91-100%), exceeded (>100%)
  - Implement Redis caching with 60-second TTL
  - _Requirements: 7.1, 7.2, 7.14, 18.5_
  - _Complexity: Medium_
  - _Assigned to: Full-Stack Lead_

- [~] 3.8 Implement admin alerts endpoints
  - Create alerts routes (src/routes/admin.routes.ts)
  - GET /api/v1/admin/alerts - Return all alerts with unread count, severity filter
  - PATCH /api/v1/admin/alerts/:id/read - Mark alert as read
  - _Requirements: 7.11, 7.12_
  - _Complexity: Small_
  - _Assigned to: Full-Stack Lead_

- [~] 3.9 Implement marketplace listing and order endpoints
  - Create marketplace routes (src/routes/marketplace.routes.ts)
  - GET /api/v1/marketplace/listings - Return available listings with filters (species, zone, price, date) and sorting
  - GET /api/v1/marketplace/listings/:id - Return detailed listing information
  - POST /api/v1/marketplace/orders - Create order within transaction (create order, update listing quantity, create notification, update status if sold out)
  - GET /api/v1/marketplace/orders - Return buyer's order history with pagination
  - Implement Redis caching for listings with 120-second TTL
  - Implement row-level security for buyer orders
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.12, 11.1, 11.2, 11.3, 11.4, 11.7, 11.8, 11.9, 11.10, 14.1, 14.2, 14.3, 14.4, 16.3, 18.4, 22.3_
  - _Complexity: Large_
  - _Assigned to: Full-Stack Lead_

- [~] 3.10 Implement marketplace statistics and activity feed endpoints
  - Create marketplace stats routes (src/routes/marketplace.routes.ts)
  - GET /api/v1/marketplace/stats - Return marketplace statistics (active listings, orders today, weight sold, avg price)
  - GET /api/v1/marketplace/activity - Return recent activity feed (listings created, orders placed)
  - Implement Redis caching: stats with 180-second TTL, activity with 60-second TTL
  - _Requirements: 12.1, 12.2, 12.3, 12.9, 13.1, 13.2, 13.3, 13.4, 13.9, 13.10, 18.3, 18.6_
  - _Complexity: Medium_
  - _Assigned to: Full-Stack Lead_

- [~] 3.11 Implement reference data endpoints
  - Create reference routes (src/routes/reference.routes.ts)
  - GET /api/v1/species - Return all fish species with reference prices
  - GET /api/v1/zones - Return all fishing zones with coordinates and restrictions
  - _Requirements: 2.3, 2.4_
  - _Complexity: Small_
  - _Assigned to: Full-Stack Lead_

- [~] 3.12 Implement health check and metrics endpoints
  - Create health routes (src/routes/health.routes.ts)
  - GET /api/v1/health - Return database and Redis connection status
  - GET /api/v1/metrics - Return uptime, request count, error count, average response time
  - _Requirements: 25.10, 25.11_
  - _Complexity: Small_
  - _Assigned to: Full-Stack Lead_

- [~] 3.13 Checkpoint - Test all API endpoints
  - Test authentication endpoints with valid and invalid credentials
  - Test fisher endpoints with various scenarios
  - Test admin endpoints with role-based access
  - Test marketplace endpoints with filters and pagination
  - Test error handling and validation for all endpoints
  - Verify response times meet performance requirements
  - Ensure all tests pass, ask the user if questions arise.
  - _Complexity: Medium_
  - _Assigned to: Full-Stack Lead_

### Phase 4: Fisher App Frontend

- [~] 4.1 Initialize Fisher App project with React and TypeScript
  - Create apps/fisher-app with Vite + React + TypeScript template
  - Install dependencies: react-router-dom, @tanstack/react-query, axios, tailwindcss, react-hook-form, zod, date-fns
  - Configure Tailwind CSS with mobile-first design system
  - Set up Vite proxy for API requests to backend:5000
  - Configure port 3002 in vite.config.ts
  - _Requirements: 27.1, 27.2_
  - _Complexity: Small_
  - _Assigned to: Frontend Dev 1_

- [~] 4.2 Create authentication context and login page
  - Create AuthContext for managing JWT token in memory
  - Create login page with license number and password fields
  - Implement login form with validation using react-hook-form + Zod
  - Store JWT in memory and refresh token in HttpOnly cookie
  - Implement automatic token refresh on expiration
  - Implement logout functionality
  - _Requirements: 1.1, 1.6, 1.7, 1.10_
  - _Complexity: Large_
  - _Assigned to: Frontend Dev 1_

- [~] 4.3 Create Fisher App layout and navigation
  - Create responsive layout component with header and bottom navigation
  - Implement mobile-optimized navigation menu with hamburger icon
  - Create navigation links: Home, Submit Catch, My Catches, Notifications, Profile
  - Display notification badge with unread count
  - Ensure touch targets are at least 44x44 pixels
  - _Requirements: 27.3, 27.12_
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 1_

- [~] 4.4 Create 4-step catch submission wizard
  - Create catch submission wizard with steps: Basic Info, Photos, Location, Review
  - Step 1: Species dropdown, weight input (0.1-500 kg), catch date picker
  - Step 2: Photo upload with preview (1-3 photos, max 5MB each)
  - Step 3: Zone dropdown with Lake Tana zones
  - Step 4: Review all information before submission
  - Implement form validation with react-hook-form + Zod
  - Use mobile-optimized input types: type="number", type="date"
  - Display success message and redirect to My Catches on submission
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.11, 27.4, 27.5_
  - _Complexity: Large_
  - _Assigned to: Frontend Dev 1_

- [~] 4.5 Implement photo upload functionality
  - Create photo upload component with drag-and-drop support
  - Validate file type (JPEG, PNG, WebP) and size (max 5MB)
  - Display photo previews in responsive grid
  - Upload photos to backend API which handles Cloudinary upload
  - Show upload progress indicator
  - _Requirements: 17.1, 17.2, 17.3, 27.6_
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 1_

- [~] 4.6 Create My Catches page with status badges
  - Create My Catches page displaying fisher's catch history
  - Display catch cards with: species, weight, date, status badge, primary photo
  - Implement status badges with color coding: pending (yellow), approved (green), rejected (red)
  - Implement pagination or infinite scroll
  - Display loading skeletons while fetching data
  - _Requirements: 3.6, 27.6_
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 1_

- [~] 4.7 Create notifications panel
  - Create notifications panel component
  - Display notifications in reverse chronological order
  - Show approval notifications with green icon, rejection notifications with red icon
  - Display rejection reason for rejected catches
  - Implement mark as read functionality
  - Update notification badge count in real-time
  - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.8_
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 1_

- [~] 4.8 Create fisher profile page
  - Create profile page displaying fisher information
  - Show: name, license number, phone, region, license validity dates, boat info
  - Display license status indicator (valid/expired)
  - _Requirements: 23.4_
  - _Complexity: Small_
  - _Assigned to: Frontend Dev 1_

- [~] 4.9 Optimize Fisher App for mobile performance
  - Implement lazy loading for images
  - Optimize bundle size with code splitting
  - Implement responsive images with appropriate sizes
  - Test on 3G network simulation
  - Achieve Lighthouse mobile performance score of at least 80
  - Achieve First Contentful Paint under 2 seconds on 3G
  - _Requirements: 27.9, 27.10, 27.11_
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 1_

- [~] 4.10 Checkpoint - Test Fisher App functionality
  - Test login and logout flows
  - Test catch submission wizard with valid and invalid inputs
  - Test photo upload with various file types and sizes
  - Test My Catches page with different catch statuses
  - Test notifications panel
  - Test responsive design on various mobile screen sizes (320px-768px)
  - Ensure all tests pass, ask the user if questions arise.
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 1_

### Phase 5: Admin Dashboard Frontend

- [~] 5.1 Initialize Admin Dashboard project with React and TypeScript
  - Create apps/admin-dashboard with Vite + React + TypeScript template
  - Install dependencies: react-router-dom, @tanstack/react-query, axios, tailwindcss, react-hook-form, zod, recharts, date-fns
  - Configure Tailwind CSS with desktop-optimized design system
  - Set up Vite proxy for API requests to backend:5000
  - Configure port 3001 in vite.config.ts
  - _Requirements: 28.1_
  - _Complexity: Small_
  - _Assigned to: Frontend Dev 2_

- [~] 5.2 Create authentication and role-based navigation
  - Create AuthContext for managing JWT token and user role
  - Create login page with email and password fields
  - Implement role-based navigation menu (different menus for admin, super_admin, field_officer)
  - Implement session timeout handling with redirect to login
  - _Requirements: 5.1, 5.8, 5.9_
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 2_

- [~] 5.3 Create Admin Dashboard layout with sidebar navigation
  - Create desktop-optimized layout with sidebar and main content area
  - Implement sidebar navigation: Dashboard, Daily Catches, Quotas & Rules, Alerts, Users & Roles
  - Display user role and name in header
  - Implement logout functionality
  - _Requirements: 28.2_
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 2_

- [~] 5.4 Create dashboard overview page with KPIs and charts
  - Create dashboard overview page with 4-column KPI grid
  - Display KPIs: total catches today, pending approvals, approved today, rejected today
  - Create bar chart for catches by species using Recharts
  - Create bar chart for catches by zone using Recharts
  - Display recent catch submissions list with status indicators
  - Implement date range selector (7d, 30d, 90d, today)
  - Display loading skeletons while fetching data
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.9, 8.11, 28.3, 28.7_
  - _Complexity: Large_
  - _Assigned to: Frontend Dev 2_

- [~] 5.5 Create quota monitoring panel
  - Create quota monitoring section on dashboard
  - Display all 6 species with quota bars showing consumption percentage
  - Implement color coding: green (0-70%), yellow (71-90%), red (91-100%)
  - Display warning banner when any quota is exceeded
  - Show quota details: limit, consumed, percentage, status
  - _Requirements: 7.1, 7.2, 7.13_
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 2_

- [~] 5.6 Create Daily Catches management page
  - Create Daily Catches page with catch list table
  - Implement filter controls: date range, species, zone, fisher name, status
  - Implement search functionality for fisher name
  - Display catch table with sortable columns: fisher, species, zone, weight, date, status
  - Implement pagination with page size selector
  - Display loading skeletons while fetching data
  - _Requirements: 6.1, 6.2, 28.4, 28.6_
  - _Complexity: Large_
  - _Assigned to: Frontend Dev 2_

- [~] 5.7 Create catch detail view with approval/rejection workflow
  - Create catch detail modal or split-view layout
  - Display all catch information: photos gallery, species, weight, zone, catch date, fisher details, license status
  - Display fisher's license validity period and status
  - Implement photo gallery with zoom capability
  - Create Approve button and Reject button
  - Create rejection modal with reason textarea (minimum 10 characters)
  - Display success toast on approval/rejection
  - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.15, 17.10, 28.8_
  - _Complexity: Large_
  - _Assigned to: Frontend Dev 2_

- [~] 5.8 Create alerts page
  - Create alerts page displaying all alerts in reverse chronological order
  - Display alert cards with severity indicators: warning (yellow), critical (orange), exceeded (red)
  - Show species name, message, threshold percentage, timestamp
  - Implement mark as read functionality
  - Display unread count badge on alerts navigation icon
  - _Requirements: 7.9, 7.11, 7.12_
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 2_

- [~] 5.9 Implement keyboard shortcuts for common actions
  - Implement keyboard shortcut: "A" for approve catch
  - Implement keyboard shortcut: "R" for reject catch
  - Implement keyboard shortcut: "/" for search focus
  - Display keyboard shortcuts help modal
  - _Requirements: 28.5_
  - _Complexity: Small_
  - _Assigned to: Frontend Dev 2_

- [~] 5.10 Optimize Admin Dashboard for desktop performance
  - Implement data table virtualization for lists exceeding 100 items
  - Optimize bundle size with code splitting
  - Test on desktop browsers (Chrome, Firefox, Edge)
  - Achieve Lighthouse desktop performance score of at least 90
  - _Requirements: 28.10, 28.11_
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 2_

- [~] 5.11 Checkpoint - Test Admin Dashboard functionality
  - Test login with different user roles
  - Test role-based navigation visibility
  - Test dashboard KPIs and charts with different date ranges
  - Test catch approval and rejection workflows
  - Test filters and search on Daily Catches page
  - Test quota monitoring and alerts
  - Test keyboard shortcuts
  - Test responsive design on desktop screen sizes (1280px-1920px)
  - Ensure all tests pass, ask the user if questions arise.
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 2_

### Phase 6: Marketplace Frontend

- [~] 6.1 Initialize Marketplace project with React and TypeScript
  - Create apps/marketplace with Vite + React + TypeScript template
  - Install dependencies: react-router-dom, @tanstack/react-query, axios, tailwindcss, react-hook-form, zod, date-fns
  - Configure Tailwind CSS with hybrid responsive design system
  - Set up Vite proxy for API requests to backend:5000
  - Configure port 3003 in vite.config.ts
  - _Requirements: 29.1_
  - _Complexity: Small_
  - _Assigned to: Frontend Dev 3_

- [~] 6.2 Create marketplace layout and navigation
  - Create responsive layout with header and footer
  - Implement navigation: Home, Browse, My Orders, Login/Register
  - Create responsive navigation menu that adapts to screen size
  - Display user name and logout button when authenticated
  - _Requirements: 29.11_
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 3_

- [~] 6.3 Create marketplace home page
  - Create hero section with platform value proposition
  - Display featured listings carousel
  - Show trust badges: "Government Verified", "Fresh Catch", "Direct from Fishers"
  - Display marketplace statistics overview
  - Implement responsive layout: single column on mobile, multi-column on desktop
  - _Requirements: 29.1, 29.2_
  - _Complexity: Medium_
  - _Assigned to: Frontend Dev 3_

- [~] 6.4 Create browse page with filters and listing grid
  - Create browse page with listing grid
  - Implement responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop
  - Display listing cards with: species, weight, price/kg, total price, catch date, zone, fisher name, verified badge, photo
  - Implement filter panel: species, zone, price range, catch date
  - Create mobile-optimized filter panel that slides in from side
  - Implement search input for species and zone names
  - Implement sort options: newest, oldest, price ascending, price descending
  - Display "No listings found" message when no results
  - Implement pagination
  - Display loading skeletons while fetching data
  - _Requirements: 10.1, 10.2, 10.3, 10.6, 10.7, 10.8, 10.9, 10.10, 10.13, 29.2, 29.3_
  - _Complexity: Large_
  - _Assigned to: Frontend Dev 3_

- [~] 6.5 Create listing detail page with order form
  - Create listing detail page with photo gallery
  - Display all listing information: species details, catch date, zone, weight available, price/kg, total price, fisher name, verified badge
  - Implement photo gallery with responsive images using srcset
  - Create order form with quantity input (0.5 kg to available weight)
  - Calculate and display total price in real-time as quantity changes
  - Disable "Place Order" button if not authenticated
  - Redirect to login if unauthenticated user clicks "Place Order"
  - Display success message and redirect to order confirmation on successful order
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.12, 29.6, 29.7_
  - _Complexity: Large_
  - _Assigned to: Frontend Dev 3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- The implementation follows a phased approach: Infrastructure → Backend → Frontends → Integration → Testing
- All three frontend applications can be developed in parallel after backend core is complete
- Database transactions ensure data consistency for critical operations (catch approval, order placement)
- Redis caching improves performance for frequently accessed data
- Security is built-in from the start with JWT authentication, role-based authorization, and input validation
- The monorepo structure enables code sharing and consistent tooling across all applications

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.8", "1.9"] },
    { "id": 3, "tasks": ["1.5"] },
    { "id": 4, "tasks": ["1.6", "1.7"] },
    { "id": 5, "tasks": ["1.10"] },
    { "id": 6, "tasks": ["2.1", "2.4", "2.6"] },
    { "id": 7, "tasks": ["2.2", "2.3", "2.5", "2.7"] },
    { "id": 8, "tasks": ["2.8"] },
    { "id": 9, "tasks": ["3.1", "3.11", "3.12"] },
    { "id": 10, "tasks": ["3.2", "3.4", "3.7"] },
    { "id": 11, "tasks": ["3.3", "3.5", "3.8", "3.9"] },
    { "id": 12, "tasks": ["3.6", "3.10"] },
    { "id": 13, "tasks": ["3.13"] },
    { "id": 14, "tasks": ["4.1", "5.1", "6.1"] },
    { "id": 15, "tasks": ["4.2", "5.2", "6.2"] },
    { "id": 16, "tasks": ["4.3", "5.3", "6.3"] },
    { "id": 17, "tasks": ["4.4", "4.5", "5.4", "5.5", "6.4"] },
    { "id": 18, "tasks": ["4.6", "5.6", "6.5"] },
    { "id": 19, "tasks": ["4.7", "5.7", "5.8"] },
    { "id": 20, "tasks": ["4.8", "5.9"] },
    { "id": 21, "tasks": ["4.9", "5.10"] },
    { "id": 22, "tasks": ["4.10", "5.11"] }
  ]
}
```
