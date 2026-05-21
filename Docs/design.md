# Design Document

## Introduction

This document provides the comprehensive technical design for the ASSA (Aquatic Sustainability and Supply Administration) Smart Fisheries System. The system is a three-module digital platform that creates a complete, verifiable digital chain from catch to market with government oversight.

The design covers system architecture, database schema, API contracts, real-time communication, authentication flows, component design, and correctness properties that ensure the system meets all functional requirements.

## System Overview

The ASSA platform consists of three interconnected frontend modules sharing a single backend:

1. **Fisher App** (Port 3002) - Mobile-first PWA for fishers to submit catch reports
2. **Admin Dashboard** (Port 3001) - Desktop-optimized government control panel
3. **Marketplace** (Port 3003) - Hybrid responsive consumer marketplace

All modules communicate with a unified **Backend API** (Port 5000) built with Node.js/Express, backed by PostgreSQL for data persistence, Redis for caching and real-time pub/sub, and Cloudinary for photo storage.

### Key Architectural Principles

1. **Single Source of Truth**: One PostgreSQL database serves all modules
2. **Real-Time State Propagation**: Server-Sent Events (SSE) ensure immediate UI updates across modules
3. **Transaction Atomicity**: Critical operations execute within database transactions
4. **Separation of Concerns**: Clear boundaries between presentation, business logic, and data layers
5. **Security by Default**: Authentication, authorization, and audit logging at every layer

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Routing**: React Router v6
- **State Management**: TanStack Query v5 (server state), React Context (auth state)
- **Styling**: Tailwind CSS 3
- **HTTP Client**: Axios
- **Form Validation**: React Hook Form + Zod
- **Charts**: Recharts (Admin Dashboard)
- **Date Handling**: date-fns

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express 4
- **Language**: TypeScript
- **Database**: PostgreSQL 15
- **ORM**: Drizzle ORM
- **Cache**: Redis 7
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Validation**: Zod
- **File Upload**: Multer + Cloudinary SDK
- **Logging**: Winston
- **Testing**: Vitest + Supertest

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Photo Storage**: Cloudinary
- **Development**: Hot reload for all services
- **Database Migrations**: Drizzle Kit


## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├──────────────────┬──────────────────┬──────────────────────────┤
│   Fisher App     │  Admin Dashboard │      Marketplace         │
│   (React:3002)   │   (React:3001)   │     (React:3003)         │
│   Mobile-First   │  Desktop-Optimized│   Hybrid Responsive     │
└────────┬─────────┴────────┬──────────┴──────────┬──────────────┘
         │                  │                      │
         │    HTTP/REST     │     HTTP/REST        │   HTTP/REST
         │    SSE Events    │     SSE Events       │   SSE Events
         └──────────────────┼──────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Backend API   │
                    │ (Express:5000) │
                    │   TypeScript   │
                    └───────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼─────┐     ┌─────▼──────┐    ┌─────▼──────┐
    │PostgreSQL│     │   Redis    │    │ Cloudinary │
    │    15    │     │     7      │    │   Photos   │
    │ Database │     │Cache+PubSub│    │  Storage   │
    └──────────┘     └────────────┘    └────────────┘
```

### Monorepo Structure

```
assa-smart-fisheries-system/
├── apps/
│   ├── fisher-app/          # Fisher App frontend (Vite + React)
│   ├── admin-dashboard/     # Admin Dashboard frontend (Vite + React)
│   ├── marketplace/         # Marketplace frontend (Vite + React)
│   └── backend/             # Backend API (Express + TypeScript)
│       ├── src/
│       │   ├── routes/      # API route handlers
│       │   ├── services/    # Business logic layer
│       │   ├── middleware/  # Auth, validation, error handling
│       │   ├── db/          # Database schema and migrations
│       │   ├── utils/       # Helpers and utilities
│       │   └── index.ts     # Application entry point
│       └── package.json
├── packages/
│   ├── shared-types/        # Shared TypeScript types
│   └── shared-utils/        # Shared utility functions
├── docker-compose.yml       # Development environment
├── .env.example             # Environment variables template
└── README.md
```

### Module Communication Flow

**Catch Approval Flow** (demonstrates cross-module real-time sync):

```
1. Admin clicks "Approve" in Admin Dashboard
   ↓
2. PATCH /api/v1/admin/catches/:id/approve
   ↓
3. Backend executes transaction:
   - Update catch status → "approved"
   - Create marketplace listing
   - Create fisher notification
   - Update species quota
   ↓
4. Backend publishes to Redis pub/sub:
   - "catch:approved" event
   - "listing:created" event
   - "quota:updated" event
   ↓
5. SSE distributes events to connected clients:
   - Fisher App: Updates "My Catches" status badge
   - Admin Dashboard: Removes from pending list, updates quota bar
   - Marketplace: Adds new listing to browse grid
   ↓
6. All UIs update within 3 seconds without page refresh
```


## Database Schema Design

### Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    users     │         │   fishers    │         │    boats     │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ id (PK)      │◄────────│ id (PK)      │◄────────│ id (PK)      │
│ email (UQ)   │         │ user_id (FK) │         │ fisher_id(FK)│
│ password_hash│         │ license_no   │         │ name         │
│ role (ENUM)  │         │ first_name   │         │ registration │
│ created_at   │         │ last_name    │         └──────────────┘
└──────────────┘         │ phone        │
                         │ region       │
                         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │   catches    │
                         ├──────────────┤
                         │ id (PK)      │
                         │ fisher_id(FK)│───────┐
                         │ species_id   │       │
                         │ zone_id (FK) │       │
                         │ weight       │       │
                         │ catch_date   │       │
                         │ photos (JSON)│       │
                         │ status (ENUM)│       │
                         │ rejection_   │       │
                         │   reason     │       │
                         └──────┬───────┘       │
                                │               │
                         ┌──────▼───────┐       │
                         │   listings   │       │
                         ├──────────────┤       │
                         │ id (PK)      │       │
                         │ catch_id(FK) │───────┘
                         │ price_per_kg │
                         │ available_qty│
                         │ status (ENUM)│
                         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │    orders    │
                         ├──────────────┤
                         │ id (PK)      │
                         │ listing_id   │
                         │ buyer_id (FK)│
                         │ quantity     │
                         │ total_price  │
                         │ status (ENUM)│
                         └──────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   species    │         │    zones     │         │   quotas     │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ id (PK)      │         │ id (PK)      │         │ id (PK)      │
│ name         │         │ name         │         │ species_id   │
│ scientific   │         │ coordinates  │         │ period_start │
│ ref_price    │         │ restrictions │         │ period_end   │
└──────────────┘         └──────────────┘         │ limit_kg     │
                                                   │ consumed_kg  │
                                                   └──────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│notifications │         │    alerts    │         │  audit_logs  │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ id (PK)      │         │ id (PK)      │         │ id (PK)      │
│ user_id (FK) │         │ species_id   │         │ user_id      │
│ type (ENUM)  │         │ severity     │         │ action       │
│ title        │         │ message      │         │ resource_type│
│ message      │         │ threshold    │         │ resource_id  │
│ read         │         │ is_read      │         │ details(JSON)│
│ created_at   │         │ created_at   │         │ ip_address   │
└──────────────┘         └──────────────┘         │ created_at   │
                                                   └──────────────┘
```

### Core Tables Definition

#### users
```typescript
{
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email: varchar(255) UNIQUE NOT NULL,
  password_hash: varchar(255) NOT NULL,
  role: user_role_enum NOT NULL, // 'fisher' | 'admin' | 'super_admin' | 'buyer' | 'field_officer'
  region: varchar(100),
  is_active: boolean DEFAULT true,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

#### fishers
```typescript
{
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id: uuid REFERENCES users(id) ON DELETE CASCADE,
  license_number: varchar(50) UNIQUE NOT NULL,
  first_name: varchar(100) NOT NULL,
  last_name: varchar(100) NOT NULL,
  phone: varchar(20),
  region: varchar(100) NOT NULL,
  license_issued_date: date NOT NULL,
  license_expiry_date: date NOT NULL,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

#### catches
```typescript
{
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fisher_id: uuid REFERENCES fishers(id) ON DELETE CASCADE NOT NULL,
  species_id: uuid REFERENCES species(id) ON DELETE RESTRICT NOT NULL,
  zone_id: uuid REFERENCES zones(id) ON DELETE RESTRICT NOT NULL,
  weight: decimal(10,2) CHECK (weight > 0 AND weight <= 500) NOT NULL,
  catch_date: date CHECK (catch_date <= CURRENT_DATE) NOT NULL,
  photos: jsonb NOT NULL, // Array of Cloudinary URLs
  status: catch_status_enum DEFAULT 'pending', // 'pending' | 'approved' | 'rejected'
  rejection_reason: text,
  approved_by: uuid REFERENCES users(id),
  approved_at: timestamptz,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

#### listings
```typescript
{
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catch_id: uuid UNIQUE REFERENCES catches(id) ON DELETE CASCADE NOT NULL,
  price_per_kg: decimal(10,2) CHECK (price_per_kg > 0) NOT NULL,
  available_quantity: decimal(10,2) CHECK (available_quantity >= 0) NOT NULL,
  status: listing_status_enum DEFAULT 'available', // 'available' | 'sold' | 'expired'
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

#### orders
```typescript
{
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id: uuid REFERENCES listings(id) ON DELETE RESTRICT NOT NULL,
  buyer_id: uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  quantity: decimal(10,2) CHECK (quantity > 0) NOT NULL,
  total_price: decimal(10,2) CHECK (total_price > 0) NOT NULL,
  status: order_status_enum DEFAULT 'pending', // 'pending' | 'confirmed' | 'completed' | 'cancelled'
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```


#### species
```typescript
{
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name: varchar(100) NOT NULL,
  scientific_name: varchar(150),
  reference_price_per_kg: decimal(10,2) NOT NULL,
  description: text,
  created_at: timestamptz DEFAULT now()
}
```

#### zones
```typescript
{
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name: varchar(100) NOT NULL,
  coordinates: jsonb, // GeoJSON polygon
  restrictions: text,
  is_active: boolean DEFAULT true,
  created_at: timestamptz DEFAULT now()
}
```

#### quotas
```typescript
{
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id: uuid REFERENCES species(id) ON DELETE RESTRICT NOT NULL,
  period_start: date NOT NULL,
  period_end: date NOT NULL,
  limit_kg: decimal(12,2) CHECK (limit_kg > 0) NOT NULL,
  consumed_kg: decimal(12,2) DEFAULT 0 CHECK (consumed_kg >= 0) NOT NULL,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  UNIQUE(species_id, period_start, period_end)
}
```

#### notifications
```typescript
{
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id: uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type: notification_type_enum NOT NULL, // 'approval' | 'rejection' | 'order' | 'alert'
  title: varchar(200) NOT NULL,
  message: text NOT NULL,
  related_resource_type: varchar(50), // 'catch' | 'order' | 'listing'
  related_resource_id: uuid,
  is_read: boolean DEFAULT false,
  created_at: timestamptz DEFAULT now()
}
```

#### alerts
```typescript
{
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id: uuid REFERENCES species(id) ON DELETE CASCADE,
  severity: alert_severity_enum NOT NULL, // 'warning' | 'critical' | 'exceeded'
  message: text NOT NULL,
  threshold_percentage: integer,
  is_read: boolean DEFAULT false,
  created_at: timestamptz DEFAULT now()
}
```

#### audit_logs
```typescript
{
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id: uuid REFERENCES users(id) ON DELETE SET NULL,
  action: varchar(100) NOT NULL, // 'login' | 'approve_catch' | 'reject_catch' | 'place_order'
  resource_type: varchar(50), // 'catch' | 'order' | 'quota' | 'user'
  resource_id: uuid,
  details: jsonb, // Additional context
  ip_address: inet,
  user_agent: text,
  created_at: timestamptz DEFAULT now()
}
```

#### refresh_tokens
```typescript
{
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id: uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token: varchar(255) UNIQUE NOT NULL,
  expires_at: timestamptz NOT NULL,
  created_at: timestamptz DEFAULT now()
}
```

### Indexes for Performance

```sql
-- Frequently queried columns
CREATE INDEX idx_catches_fisher_id ON catches(fisher_id);
CREATE INDEX idx_catches_status ON catches(status);
CREATE INDEX idx_catches_created_at ON catches(created_at DESC);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_listing_id ON orders(listing_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite indexes for complex queries
CREATE INDEX idx_quotas_species_period ON quotas(species_id, period_start, period_end);
CREATE INDEX idx_catches_species_zone ON catches(species_id, zone_id);
```

### Database Triggers

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fishers_updated_at BEFORE UPDATE ON fishers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_catches_updated_at BEFORE UPDATE ON catches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotas_updated_at BEFORE UPDATE ON quotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Prevent modification of audit logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
END;
$$ language 'plpgsql';

CREATE TRIGGER prevent_audit_log_update BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER prevent_audit_log_delete BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
```


## API Design

### API Versioning and Base URL

All API endpoints are versioned and prefixed with `/api/v1`.

**Base URL**: `http://localhost:5000/api/v1`

### Authentication Endpoints

#### POST /api/v1/auth/login
**Description**: Authenticate user and return JWT + refresh token

**Request Body**:
```typescript
{
  email?: string,           // For admin/buyer
  licenseNumber?: string,   // For fisher
  password: string
}
```

**Response** (200 OK):
```typescript
{
  accessToken: string,      // JWT, expires in 15 minutes
  user: {
    id: string,
    email?: string,
    role: 'fisher' | 'admin' | 'super_admin' | 'buyer' | 'field_officer',
    firstName?: string,
    lastName?: string
  }
}
```

**Sets Cookie**: `refreshToken` (HttpOnly, Secure, SameSite=Strict, 7 days)

**Error Responses**:
- 400: Invalid request body
- 401: Invalid credentials

---

#### POST /api/v1/auth/refresh
**Description**: Refresh access token using refresh token from cookie

**Response** (200 OK):
```typescript
{
  accessToken: string
}
```

**Error Responses**:
- 401: Invalid or expired refresh token

---

#### POST /api/v1/auth/logout
**Description**: Invalidate refresh token and clear cookie

**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200 OK):
```typescript
{
  message: "Logged out successfully"
}
```

---

### Fisher Endpoints

#### GET /api/v1/fisher/profile
**Description**: Get authenticated fisher's profile

**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200 OK):
```typescript
{
  id: string,
  licenseNumber: string,
  firstName: string,
  lastName: string,
  phone: string,
  region: string,
  licenseIssuedDate: string,
  licenseExpiryDate: string,
  boat?: {
    id: string,
    name: string,
    registrationNumber: string
  }
}
```

---

#### POST /api/v1/fisher/catches
**Description**: Submit a new catch report

**Headers**: `Authorization: Bearer <accessToken>`

**Request Body**:
```typescript
{
  speciesId: string,
  zoneId: string,
  weight: number,          // 0.1 to 500 kg
  catchDate: string,       // ISO date, not in future
  photos: string[]         // Array of Cloudinary URLs (1-3)
}
```

**Response** (201 Created):
```typescript
{
  id: string,
  fisherId: string,
  speciesId: string,
  zoneId: string,
  weight: number,
  catchDate: string,
  photos: string[],
  status: 'pending',
  createdAt: string
}
```

**Error Responses**:
- 400: Validation error (invalid weight, missing photos, future date)
- 401: Unauthorized (expired license)
- 500: Server error

---

#### GET /api/v1/fisher/catches
**Description**: Get authenticated fisher's catch history

**Headers**: `Authorization: Bearer <accessToken>`

**Query Parameters**:
- `status`: 'pending' | 'approved' | 'rejected' (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)

**Response** (200 OK):
```typescript
{
  catches: [
    {
      id: string,
      species: { id: string, name: string },
      zone: { id: string, name: string },
      weight: number,
      catchDate: string,
      photos: string[],
      status: 'pending' | 'approved' | 'rejected',
      rejectionReason?: string,
      createdAt: string
    }
  ],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

---

#### GET /api/v1/fisher/notifications
**Description**: Get authenticated fisher's notifications

**Headers**: `Authorization: Bearer <accessToken>`

**Query Parameters**:
- `unreadOnly`: boolean (default: false)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response** (200 OK):
```typescript
{
  notifications: [
    {
      id: string,
      type: 'approval' | 'rejection' | 'order',
      title: string,
      message: string,
      relatedResourceType?: string,
      relatedResourceId?: string,
      isRead: boolean,
      createdAt: string
    }
  ],
  unreadCount: number,
  pagination: { page: number, limit: number, total: number }
}
```

---

#### PATCH /api/v1/fisher/notifications/:id/read
**Description**: Mark notification as read

**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200 OK):
```typescript
{
  message: "Notification marked as read"
}
```

---

### Admin Endpoints

#### GET /api/v1/admin/dashboard/kpis
**Description**: Get dashboard KPI metrics

**Headers**: `Authorization: Bearer <accessToken>`

**Query Parameters**:
- `dateRange`: '7d' | '30d' | '90d' | 'today' (default: 'today')

**Response** (200 OK):
```typescript
{
  totalCatchesToday: number,
  pendingApprovals: number,
  approvedToday: number,
  rejectedToday: number,
  catchesBySpecies: [
    { speciesName: string, count: number, totalWeight: number }
  ],
  catchesByZone: [
    { zoneName: string, count: number }
  ],
  recentCatches: [
    {
      id: string,
      fisherName: string,
      species: string,
      weight: number,
      status: string,
      createdAt: string
    }
  ]
}
```

---

#### GET /api/v1/admin/catches
**Description**: Get all catch submissions with filters

**Headers**: `Authorization: Bearer <accessToken>`

**Query Parameters**:
- `status`: 'pending' | 'approved' | 'rejected' (optional)
- `speciesId`: string (optional)
- `zoneId`: string (optional)
- `fisherName`: string (optional, search)
- `startDate`: string (ISO date, optional)
- `endDate`: string (ISO date, optional)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response** (200 OK):
```typescript
{
  catches: [
    {
      id: string,
      fisher: { id: string, firstName: string, lastName: string, licenseNumber: string },
      species: { id: string, name: string },
      zone: { id: string, name: string },
      weight: number,
      catchDate: string,
      photos: string[],
      status: string,
      createdAt: string
    }
  ],
  pagination: { page: number, limit: number, total: number, totalPages: number }
}
```

---

#### GET /api/v1/admin/catches/:id
**Description**: Get detailed catch information

**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200 OK):
```typescript
{
  id: string,
  fisher: {
    id: string,
    firstName: string,
    lastName: string,
    licenseNumber: string,
    licenseExpiryDate: string,
    phone: string
  },
  species: { id: string, name: string, scientificName: string },
  zone: { id: string, name: string, restrictions: string },
  weight: number,
  catchDate: string,
  photos: string[],
  status: 'pending' | 'approved' | 'rejected',
  rejectionReason?: string,
  approvedBy?: { id: string, email: string },
  approvedAt?: string,
  createdAt: string
}
```

---

#### PATCH /api/v1/admin/catches/:id/approve
**Description**: Approve a catch submission (creates listing, notification, updates quota)

**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200 OK):
```typescript
{
  message: "Catch approved successfully",
  catch: { id: string, status: 'approved' },
  listing: { id: string, pricePerKg: number }
}
```

**Error Responses**:
- 400: Catch already processed
- 403: Insufficient permissions
- 500: Transaction failed

---

#### PATCH /api/v1/admin/catches/:id/reject
**Description**: Reject a catch submission

**Headers**: `Authorization: Bearer <accessToken>`

**Request Body**:
```typescript
{
  reason: string  // Minimum 10 characters
}
```

**Response** (200 OK):
```typescript
{
  message: "Catch rejected successfully",
  catch: { id: string, status: 'rejected', rejectionReason: string }
}
```

**Error Responses**:
- 400: Invalid reason or catch already processed
- 403: Insufficient permissions

---


#### GET /api/v1/admin/quotas
**Description**: Get all species quotas with consumption

**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200 OK):
```typescript
{
  quotas: [
    {
      id: string,
      species: { id: string, name: string },
      periodStart: string,
      periodEnd: string,
      limitKg: number,
      consumedKg: number,
      percentageUsed: number,
      status: 'safe' | 'warning' | 'critical' | 'exceeded'
    }
  ]
}
```

---

#### GET /api/v1/admin/alerts
**Description**: Get all system alerts

**Headers**: `Authorization: Bearer <accessToken>`

**Query Parameters**:
- `unreadOnly`: boolean (default: false)
- `severity`: 'warning' | 'critical' | 'exceeded' (optional)

**Response** (200 OK):
```typescript
{
  alerts: [
    {
      id: string,
      species?: { id: string, name: string },
      severity: 'warning' | 'critical' | 'exceeded',
      message: string,
      thresholdPercentage?: number,
      isRead: boolean,
      createdAt: string
    }
  ],
  unreadCount: number
}
```

---

#### PATCH /api/v1/admin/alerts/:id/read
**Description**: Mark alert as read

**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200 OK):
```typescript
{
  message: "Alert marked as read"
}
```

---

### Marketplace Endpoints

#### GET /api/v1/marketplace/listings
**Description**: Browse available marketplace listings

**Query Parameters**:
- `speciesId`: string (optional)
- `zoneId`: string (optional)
- `minPrice`: number (optional)
- `maxPrice`: number (optional)
- `catchDateFrom`: string (ISO date, optional)
- `search`: string (optional, searches species and zone names)
- `sortBy`: 'newest' | 'oldest' | 'price_asc' | 'price_desc' (default: 'newest')
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response** (200 OK):
```typescript
{
  listings: [
    {
      id: string,
      species: { id: string, name: string },
      zone: { id: string, name: string },
      weight: number,
      availableQuantity: number,
      pricePerKg: number,
      totalPrice: number,
      catchDate: string,
      photos: string[],
      fisher: { firstName: string, verified: true },
      createdAt: string
    }
  ],
  pagination: { page: number, limit: number, total: number, totalPages: number }
}
```

---

#### GET /api/v1/marketplace/listings/:id
**Description**: Get detailed listing information

**Response** (200 OK):
```typescript
{
  id: string,
  species: { id: string, name: string, scientificName: string },
  zone: { id: string, name: string },
  weight: number,
  availableQuantity: number,
  pricePerKg: number,
  totalPrice: number,
  catchDate: string,
  photos: string[],
  fisher: { id: string, firstName: string, verified: true },
  status: 'available' | 'sold',
  createdAt: string
}
```

---

#### POST /api/v1/marketplace/orders
**Description**: Place an order for a listing

**Headers**: `Authorization: Bearer <accessToken>`

**Request Body**:
```typescript
{
  listingId: string,
  quantity: number  // 0.5 to available quantity
}
```

**Response** (201 Created):
```typescript
{
  id: string,
  listingId: string,
  buyerId: string,
  quantity: number,
  totalPrice: number,
  status: 'pending',
  createdAt: string
}
```

**Error Responses**:
- 400: Invalid quantity
- 401: Unauthorized (not logged in as buyer)
- 409: Insufficient quantity available
- 500: Transaction failed

---

#### GET /api/v1/marketplace/orders
**Description**: Get authenticated buyer's order history

**Headers**: `Authorization: Bearer <accessToken>`

**Query Parameters**:
- `status`: 'pending' | 'confirmed' | 'completed' | 'cancelled' (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response** (200 OK):
```typescript
{
  orders: [
    {
      id: string,
      listing: {
        id: string,
        species: { name: string },
        photos: string[],
        fisher: { firstName: string }
      },
      quantity: number,
      totalPrice: number,
      status: string,
      createdAt: string
    }
  ],
  pagination: { page: number, limit: number, total: number }
}
```

---

#### GET /api/v1/marketplace/stats
**Description**: Get marketplace statistics

**Response** (200 OK):
```typescript
{
  activeListings: number,
  ordersToday: number,
  totalWeightSoldToday: number,
  averagePricePerKg: number
}
```

---

#### GET /api/v1/marketplace/activity
**Description**: Get recent marketplace activity feed

**Query Parameters**:
- `limit`: number (default: 10, max: 50)

**Response** (200 OK):
```typescript
{
  activities: [
    {
      id: string,
      type: 'listing_created' | 'order_placed',
      description: string,
      species: { name: string },
      timestamp: string,
      relativeTime: string  // "2 minutes ago"
    }
  ]
}
```

---

### Reference Data Endpoints

#### GET /api/v1/species
**Description**: Get all fish species

**Response** (200 OK):
```typescript
{
  species: [
    {
      id: string,
      name: string,
      scientificName: string,
      referencePricePerKg: number,
      description: string
    }
  ]
}
```

---

#### GET /api/v1/zones
**Description**: Get all fishing zones

**Response** (200 OK):
```typescript
{
  zones: [
    {
      id: string,
      name: string,
      coordinates: object,  // GeoJSON
      restrictions: string,
      isActive: boolean
    }
  ]
}
```

---

### Real-Time SSE Endpoint

#### GET /api/v1/events
**Description**: Establish Server-Sent Events connection for real-time updates

**Headers**: `Authorization: Bearer <accessToken>`

**Response**: Event stream (text/event-stream)

**Event Types**:
```typescript
// Catch status changed
{
  event: 'catch:updated',
  data: {
    catchId: string,
    status: 'approved' | 'rejected',
    fisherId: string  // For filtering
  }
}

// New listing created
{
  event: 'listing:created',
  data: {
    listingId: string,
    speciesId: string,
    zoneId: string
  }
}

// Listing quantity updated
{
  event: 'listing:updated',
  data: {
    listingId: string,
    availableQuantity: number,
    status: 'available' | 'sold'
  }
}

// Quota updated
{
  event: 'quota:updated',
  data: {
    quotaId: string,
    speciesId: string,
    consumedKg: number,
    percentageUsed: number
  }
}

// New alert created
{
  event: 'alert:created',
  data: {
    alertId: string,
    severity: 'warning' | 'critical' | 'exceeded',
    message: string
  }
}

// New notification
{
  event: 'notification:created',
  data: {
    notificationId: string,
    userId: string,  // For filtering
    type: string,
    title: string
  }
}

// Keep-alive ping
{
  event: 'ping',
  data: { timestamp: string }
}
```

---

### File Upload Endpoint

#### POST /api/v1/upload/photo
**Description**: Upload catch photo to Cloudinary

**Headers**: 
- `Authorization: Bearer <accessToken>`
- `Content-Type: multipart/form-data`

**Request Body**: FormData with `photo` field

**Response** (200 OK):
```typescript
{
  url: string,  // Cloudinary secure URL
  publicId: string
}
```

**Error Responses**:
- 400: Invalid file type or size > 5MB
- 500: Cloudinary upload failed

---

### Health and Metrics Endpoints

#### GET /api/v1/health
**Description**: Health check endpoint

**Response** (200 OK):
```typescript
{
  status: 'healthy',
  timestamp: string,
  services: {
    database: 'connected' | 'disconnected',
    redis: 'connected' | 'disconnected',
    cloudinary: 'configured' | 'not_configured'
  }
}
```

---

#### GET /api/v1/metrics
**Description**: System metrics (admin only)

**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200 OK):
```typescript
{
  uptime: number,  // seconds
  requestCount: number,
  errorCount: number,
  averageResponseTime: number,  // milliseconds
  cacheHitRate: number  // percentage
}
```


## Authentication and Authorization Architecture

### JWT Token Structure

**Access Token** (15-minute expiry):
```typescript
{
  header: {
    alg: 'HS256',
    typ: 'JWT'
  },
  payload: {
    userId: string,
    email?: string,
    role: 'fisher' | 'admin' | 'super_admin' | 'buyer' | 'field_officer',
    region?: string,
    iat: number,  // Issued at
    exp: number   // Expires at (iat + 15 minutes)
  },
  signature: string  // HMAC SHA256
}
```

**Refresh Token**: Random 64-character string stored in database with user association

### Authentication Flow

```
┌─────────┐                 ┌─────────┐                 ┌──────────┐
│ Client  │                 │ Backend │                 │ Database │
└────┬────┘                 └────┬────┘                 └────┬─────┘
     │                           │                           │
     │ POST /auth/login          │                           │
     │ {email, password}         │                           │
     ├──────────────────────────>│                           │
     │                           │ Verify credentials        │
     │                           ├──────────────────────────>│
     │                           │<──────────────────────────┤
     │                           │ User found                │
     │                           │                           │
     │                           │ bcrypt.compare(password)  │
     │                           │                           │
     │                           │ Generate JWT (15 min)     │
     │                           │ Generate refresh token    │
     │                           │                           │
     │                           │ Store refresh token       │
     │                           ├──────────────────────────>│
     │                           │<──────────────────────────┤
     │                           │                           │
     │ Set-Cookie: refreshToken  │                           │
     │ {accessToken, user}       │                           │
     │<──────────────────────────┤                           │
     │                           │                           │
     │ Store accessToken in      │                           │
     │ memory (React state)      │                           │
     │                           │                           │
     │ Subsequent requests       │                           │
     │ Authorization: Bearer JWT │                           │
     ├──────────────────────────>│                           │
     │                           │ Verify JWT signature      │
     │                           │ Check expiration          │
     │                           │ Extract userId, role      │
     │                           │                           │
     │ Response                  │                           │
     │<──────────────────────────┤                           │
     │                           │                           │
     │ (After 15 min)            │                           │
     │ POST /auth/refresh        │                           │
     │ Cookie: refreshToken      │                           │
     ├──────────────────────────>│                           │
     │                           │ Verify refresh token      │
     │                           ├──────────────────────────>│
     │                           │<──────────────────────────┤
     │                           │ Token valid               │
     │                           │                           │
     │                           │ Generate new JWT          │
     │                           │                           │
     │ {accessToken}             │                           │
     │<──────────────────────────┤                           │
     │                           │                           │
```

### Authorization Middleware

```typescript
// middleware/auth.ts

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      region: decoded.region
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Usage in routes
router.get('/admin/catches', 
  authenticate, 
  authorize('admin', 'super_admin'), 
  getCatches
);
```

### Row-Level Security Implementation

```typescript
// services/catchService.ts

export const getCatchesByFisher = async (fisherId: string, userId: string, userRole: string) => {
  // Fishers can only see their own catches
  if (userRole === 'fisher') {
    const fisher = await db.query.fishers.findFirst({
      where: eq(fishers.userId, userId)
    });
    
    if (fisher.id !== fisherId) {
      throw new ForbiddenError('Cannot access other fisher\'s catches');
    }
  }
  
  // Admins can see catches based on regional assignment
  if (userRole === 'admin') {
    const catches = await db.query.catches.findMany({
      where: and(
        eq(catches.fisherId, fisherId),
        eq(fishers.region, req.user.region)  // Regional filter
      ),
      with: { fisher: true }
    });
    return catches;
  }
  
  // Super admins can see all catches
  return db.query.catches.findMany({
    where: eq(catches.fisherId, fisherId)
  });
};
```

### Password Security

```typescript
// utils/password.ts

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string, 
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Password strength validation
export const validatePasswordStrength = (password: string): boolean => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber
  );
};
```


## Real-Time Architecture (Server-Sent Events)

### SSE Implementation Overview

Server-Sent Events (SSE) provide unidirectional real-time communication from server to clients. The system uses Redis pub/sub to distribute events across multiple server instances.

### Architecture Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Fisher App  │     │Admin Dashboard│    │ Marketplace  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │ SSE                │ SSE                 │ SSE
       │ /api/v1/events     │ /api/v1/events      │ /api/v1/events
       └────────────────────┼─────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Backend API   │
                    │  SSE Manager   │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │ Redis Pub/Sub  │
                    │   Channels:    │
                    │ - catch:events │
                    │ - listing:events│
                    │ - quota:events │
                    │ - alert:events │
                    └────────────────┘
```

### Backend SSE Implementation

```typescript
// routes/events.ts

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { SSEManager } from '../services/sseManager';

const router = Router();

router.get('/events', authenticate, (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  const clientId = `${req.user.userId}-${Date.now()}`;
  const userRole = req.user.role;
  const userId = req.user.userId;
  
  // Register client
  SSEManager.addClient(clientId, res, { userId, role: userRole });
  
  // Send initial connection event
  res.write(`data: ${JSON.stringify({ event: 'connected', clientId })}\n\n`);
  
  // Keep-alive ping every 30 seconds
  const pingInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ event: 'ping', timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(pingInterval);
    SSEManager.removeClient(clientId);
  });
});

export default router;
```

```typescript
// services/sseManager.ts

import { Response } from 'express';
import { redisClient } from '../config/redis';

interface SSEClient {
  id: string;
  response: Response;
  userId: string;
  role: string;
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  
  constructor() {
    this.subscribeToRedis();
  }
  
  addClient(clientId: string, response: Response, metadata: { userId: string; role: string }) {
    this.clients.set(clientId, {
      id: clientId,
      response,
      userId: metadata.userId,
      role: metadata.role
    });
    console.log(`SSE client connected: ${clientId}, total clients: ${this.clients.size}`);
  }
  
  removeClient(clientId: string) {
    this.clients.delete(clientId);
    console.log(`SSE client disconnected: ${clientId}, total clients: ${this.clients.size}`);
  }
  
  private subscribeToRedis() {
    const subscriber = redisClient.duplicate();
    
    subscriber.subscribe('catch:events', 'listing:events', 'quota:events', 'alert:events', 'notification:events');
    
    subscriber.on('message', (channel, message) => {
      const event = JSON.parse(message);
      this.broadcastEvent(event);
    });
  }
  
  private broadcastEvent(event: any) {
    const { type, data } = event;
    
    this.clients.forEach((client) => {
      // Filter events based on user role and ownership
      if (this.shouldSendToClient(client, event)) {
        try {
          client.response.write(`data: ${JSON.stringify({ event: type, data })}\n\n`);
        } catch (error) {
          console.error(`Failed to send event to client ${client.id}:`, error);
          this.removeClient(client.id);
        }
      }
    });
  }
  
  private shouldSendToClient(client: SSEClient, event: any): boolean {
    const { type, data } = event;
    
    // Catch events: fishers only see their own, admins see all
    if (type === 'catch:updated') {
      if (client.role === 'fisher') {
        return data.fisherId === client.userId;
      }
      return ['admin', 'super_admin'].includes(client.role);
    }
    
    // Listing events: all marketplace users see all
    if (type === 'listing:created' || type === 'listing:updated') {
      return true;
    }
    
    // Quota and alert events: admin only
    if (type === 'quota:updated' || type === 'alert:created') {
      return ['admin', 'super_admin'].includes(client.role);
    }
    
    // Notification events: only for the target user
    if (type === 'notification:created') {
      return data.userId === client.userId;
    }
    
    return false;
  }
  
  // Publish event to Redis (called from business logic)
  static publishEvent(channel: string, event: any) {
    redisClient.publish(channel, JSON.stringify(event));
  }
}

export default new SSEManager();
```

### Publishing Events from Business Logic

```typescript
// services/catchService.ts

import SSEManager from './sseManager';

export const approveCatch = async (catchId: string, adminUserId: string) => {
  return db.transaction(async (tx) => {
    // 1. Update catch status
    const updatedCatch = await tx.update(catches)
      .set({ 
        status: 'approved', 
        approvedBy: adminUserId, 
        approvedAt: new Date() 
      })
      .where(eq(catches.id, catchId))
      .returning();
    
    // 2. Create marketplace listing
    const listing = await tx.insert(listings).values({
      catchId: catchId,
      pricePerKg: calculatePrice(updatedCatch[0]),
      availableQuantity: updatedCatch[0].weight,
      status: 'available'
    }).returning();
    
    // 3. Create notification for fisher
    await tx.insert(notifications).values({
      userId: updatedCatch[0].fisherId,
      type: 'approval',
      title: 'Catch Approved',
      message: `Your catch of ${updatedCatch[0].weight}kg has been approved`,
      relatedResourceType: 'catch',
      relatedResourceId: catchId
    });
    
    // 4. Update quota
    await updateQuota(tx, updatedCatch[0].speciesId, updatedCatch[0].weight);
    
    // 5. Publish SSE events
    SSEManager.publishEvent('catch:events', {
      type: 'catch:updated',
      data: {
        catchId: catchId,
        status: 'approved',
        fisherId: updatedCatch[0].fisherId
      }
    });
    
    SSEManager.publishEvent('listing:events', {
      type: 'listing:created',
      data: {
        listingId: listing[0].id,
        speciesId: updatedCatch[0].speciesId,
        zoneId: updatedCatch[0].zoneId
      }
    });
    
    return { catch: updatedCatch[0], listing: listing[0] };
  });
};
```

### Frontend SSE Client Implementation

```typescript
// hooks/useSSE.ts (React)

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useSSE = (accessToken: string | null) => {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  
  useEffect(() => {
    if (!accessToken) return;
    
    const connectSSE = () => {
      const eventSource = new EventSource(
        `http://localhost:5000/api/v1/events?token=${accessToken}`
      );
      
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        console.log('SSE connection established');
        reconnectAttemptsRef.current = 0;
      };
      
      eventSource.addEventListener('catch:updated', (e) => {
        const data = JSON.parse(e.data);
        // Invalidate catches query to refetch
        queryClient.invalidateQueries({ queryKey: ['catches'] });
        queryClient.invalidateQueries({ queryKey: ['catch', data.catchId] });
      });
      
      eventSource.addEventListener('listing:created', (e) => {
        const data = JSON.parse(e.data);
        queryClient.invalidateQueries({ queryKey: ['listings'] });
      });
      
      eventSource.addEventListener('listing:updated', (e) => {
        const data = JSON.parse(e.data);
        queryClient.invalidateQueries({ queryKey: ['listings'] });
        queryClient.invalidateQueries({ queryKey: ['listing', data.listingId] });
      });
      
      eventSource.addEventListener('quota:updated', (e) => {
        queryClient.invalidateQueries({ queryKey: ['quotas'] });
      });
      
      eventSource.addEventListener('alert:created', (e) => {
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
      });
      
      eventSource.addEventListener('notification:created', (e) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });
      
      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 5000;
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          setTimeout(connectSSE, delay);
        }
      };
    };
    
    connectSSE();
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [accessToken, queryClient]);
};
```

### Redis Configuration

```typescript
// config/redis.ts

import { createClient } from 'redis';

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Redis reconnection failed');
      }
      return retries * 1000; // Exponential backoff
    }
  }
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis connected');
});

export const connectRedis = async () => {
  await redisClient.connect();
};
```


## Transaction Management and Data Integrity

### Critical Transaction Flows

#### 1. Catch Approval Transaction

```typescript
// services/catchService.ts

export const approveCatch = async (
  catchId: string, 
  adminUserId: string
): Promise<ApprovalResult> => {
  return db.transaction(async (tx) => {
    // Set transaction timeout
    await tx.execute(sql`SET LOCAL statement_timeout = '5s'`);
    
    // 1. Lock and update catch record
    const [catchRecord] = await tx
      .select()
      .from(catches)
      .where(eq(catches.id, catchId))
      .for('update'); // Row-level lock
    
    // Validate current status
    if (catchRecord.status !== 'pending') {
      throw new ConflictError('Catch has already been processed');
    }
    
    // Update catch status
    const [updatedCatch] = await tx
      .update(catches)
      .set({
        status: 'approved',
        approvedBy: adminUserId,
        approvedAt: new Date()
      })
      .where(eq(catches.id, catchId))
      .returning();
    
    // 2. Create marketplace listing
    const speciesPrice = await tx
      .select({ refPrice: species.referencePricePerKg })
      .from(species)
      .where(eq(species.id, updatedCatch.speciesId));
    
    const pricePerKg = speciesPrice[0].refPrice * 1.1; // 10% markup
    
    const [listing] = await tx
      .insert(listings)
      .values({
        catchId: catchId,
        pricePerKg: pricePerKg,
        availableQuantity: updatedCatch.weight,
        status: 'available'
      })
      .returning();
    
    // 3. Create fisher notification
    const fisher = await tx
      .select({ userId: fishers.userId })
      .from(fishers)
      .where(eq(fishers.id, updatedCatch.fisherId));
    
    await tx.insert(notifications).values({
      userId: fisher[0].userId,
      type: 'approval',
      title: 'Catch Approved',
      message: `Your catch of ${updatedCatch.weight}kg ${updatedCatch.speciesId} has been approved and listed in the marketplace.`,
      relatedResourceType: 'catch',
      relatedResourceId: catchId
    });
    
    // 4. Update species quota with row lock
    const [quota] = await tx
      .select()
      .from(quotas)
      .where(
        and(
          eq(quotas.speciesId, updatedCatch.speciesId),
          lte(quotas.periodStart, new Date()),
          gte(quotas.periodEnd, new Date())
        )
      )
      .for('update'); // Lock quota row
    
    const newConsumed = quota.consumedKg + updatedCatch.weight;
    const percentageUsed = (newConsumed / quota.limitKg) * 100;
    
    await tx
      .update(quotas)
      .set({ consumedKg: newConsumed })
      .where(eq(quotas.id, quota.id));
    
    // 5. Create alert if threshold exceeded
    if (percentageUsed >= 80 && quota.consumedKg / quota.limitKg * 100 < 80) {
      await tx.insert(alerts).values({
        speciesId: updatedCatch.speciesId,
        severity: 'warning',
        message: `${updatedCatch.speciesId} quota at ${percentageUsed.toFixed(1)}%`,
        thresholdPercentage: 80
      });
    } else if (percentageUsed >= 95 && quota.consumedKg / quota.limitKg * 100 < 95) {
      await tx.insert(alerts).values({
        speciesId: updatedCatch.speciesId,
        severity: 'critical',
        message: `${updatedCatch.speciesId} quota at ${percentageUsed.toFixed(1)}%`,
        thresholdPercentage: 95
      });
    } else if (percentageUsed > 100) {
      await tx.insert(alerts).values({
        speciesId: updatedCatch.speciesId,
        severity: 'exceeded',
        message: `${updatedCatch.speciesId} quota exceeded at ${percentageUsed.toFixed(1)}%`,
        thresholdPercentage: 100
      });
    }
    
    // 6. Create audit log
    await tx.insert(auditLogs).values({
      userId: adminUserId,
      action: 'approve_catch',
      resourceType: 'catch',
      resourceId: catchId,
      details: { weight: updatedCatch.weight, speciesId: updatedCatch.speciesId }
    });
    
    // Transaction commits here if all operations succeed
    return {
      catch: updatedCatch,
      listing: listing,
      quotaPercentage: percentageUsed
    };
  });
  // If any operation fails, entire transaction rolls back
};
```

#### 2. Order Placement Transaction

```typescript
// services/orderService.ts

export const placeOrder = async (
  listingId: string,
  buyerId: string,
  quantity: number
): Promise<Order> => {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL statement_timeout = '5s'`);
    
    // 1. Lock and validate listing
    const [listing] = await tx
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .for('update');
    
    if (listing.status !== 'available') {
      throw new ConflictError('Listing is no longer available');
    }
    
    if (quantity > listing.availableQuantity) {
      throw new ConflictError('Insufficient quantity available');
    }
    
    // 2. Create order
    const totalPrice = quantity * listing.pricePerKg;
    
    const [order] = await tx
      .insert(orders)
      .values({
        listingId: listingId,
        buyerId: buyerId,
        quantity: quantity,
        totalPrice: totalPrice,
        status: 'pending'
      })
      .returning();
    
    // 3. Update listing quantity
    const newQuantity = listing.availableQuantity - quantity;
    const newStatus = newQuantity === 0 ? 'sold' : 'available';
    
    await tx
      .update(listings)
      .set({
        availableQuantity: newQuantity,
        status: newStatus
      })
      .where(eq(listings.id, listingId));
    
    // 4. Notify fisher
    const catchRecord = await tx
      .select({ fisherId: catches.fisherId })
      .from(catches)
      .where(eq(catches.id, listing.catchId));
    
    const fisher = await tx
      .select({ userId: fishers.userId })
      .from(fishers)
      .where(eq(fishers.id, catchRecord[0].fisherId));
    
    await tx.insert(notifications).values({
      userId: fisher[0].userId,
      type: 'order',
      title: 'New Order Received',
      message: `You have a new order for ${quantity}kg`,
      relatedResourceType: 'order',
      relatedResourceId: order.id
    });
    
    // 5. Audit log
    await tx.insert(auditLogs).values({
      userId: buyerId,
      action: 'place_order',
      resourceType: 'order',
      resourceId: order.id,
      details: { listingId, quantity, totalPrice }
    });
    
    return order;
  });
};
```

#### 3. Catch Rejection Transaction

```typescript
// services/catchService.ts

export const rejectCatch = async (
  catchId: string,
  adminUserId: string,
  reason: string
): Promise<Catch> => {
  if (reason.length < 10) {
    throw new ValidationError('Rejection reason must be at least 10 characters');
  }
  
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL statement_timeout = '5s'`);
    
    // 1. Lock and update catch
    const [catchRecord] = await tx
      .select()
      .from(catches)
      .where(eq(catches.id, catchId))
      .for('update');
    
    if (catchRecord.status !== 'pending') {
      throw new ConflictError('Catch has already been processed');
    }
    
    const [updatedCatch] = await tx
      .update(catches)
      .set({
        status: 'rejected',
        rejectionReason: reason,
        approvedBy: adminUserId,
        approvedAt: new Date()
      })
      .where(eq(catches.id, catchId))
      .returning();
    
    // 2. Notify fisher
    const fisher = await tx
      .select({ userId: fishers.userId })
      .from(fishers)
      .where(eq(fishers.id, updatedCatch.fisherId));
    
    await tx.insert(notifications).values({
      userId: fisher[0].userId,
      type: 'rejection',
      title: 'Catch Rejected',
      message: `Your catch was rejected. Reason: ${reason}`,
      relatedResourceType: 'catch',
      relatedResourceId: catchId
    });
    
    // 3. Audit log
    await tx.insert(auditLogs).values({
      userId: adminUserId,
      action: 'reject_catch',
      resourceType: 'catch',
      resourceId: catchId,
      details: { reason }
    });
    
    return updatedCatch;
  });
};
```

### Error Handling in Transactions

```typescript
// middleware/errorHandler.ts

export class TransactionError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'TransactionError';
  }
}

export const handleTransactionError = (error: any) => {
  if (error.code === '40001') {
    // Serialization failure - retry
    throw new TransactionError('Transaction conflict, please retry', error);
  }
  
  if (error.code === '57014') {
    // Query timeout
    throw new TransactionError('Transaction timeout', error);
  }
  
  if (error.code === '23505') {
    // Unique violation
    throw new ConflictError('Resource already exists', error);
  }
  
  if (error.code === '23503') {
    // Foreign key violation
    throw new ValidationError('Referenced resource does not exist', error);
  }
  
  throw error;
};
```


## Caching Strategy with Redis

### Cache Key Patterns

```typescript
// utils/cacheKeys.ts

export const CacheKeys = {
  // KPI metrics - 5 minute TTL
  kpiMetrics: (dateRange: string) => `kpi:metrics:${dateRange}`,
  
  // Marketplace statistics - 3 minute TTL
  marketplaceStats: () => 'marketplace:stats',
  
  // Marketplace listings - 2 minute TTL
  listings: (filters: string) => `listings:${filters}`,
  
  // Quota calculations - 1 minute TTL
  quotas: () => 'quotas:all',
  quotaBySpecies: (speciesId: string) => `quota:species:${speciesId}`,
  
  // Activity feed - 1 minute TTL
  activityFeed: () => 'activity:feed',
  
  // Session data - 7 day TTL
  session: (userId: string) => `session:${userId}`,
  
  // Refresh tokens - 7 day TTL
  refreshToken: (token: string) => `refresh:${token}`
};

export const CacheTTL = {
  KPI_METRICS: 300,        // 5 minutes
  MARKETPLACE_STATS: 180,  // 3 minutes
  LISTINGS: 120,           // 2 minutes
  QUOTAS: 60,              // 1 minute
  ACTIVITY_FEED: 60,       // 1 minute
  SESSION: 604800,         // 7 days
  REFRESH_TOKEN: 604800    // 7 days
};
```

### Cache Service Implementation

```typescript
// services/cacheService.ts

import { redisClient } from '../config/redis';
import { CacheKeys, CacheTTL } from '../utils/cacheKeys';

class CacheService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redisClient.get(key);
      if (!cached) return null;
      return JSON.parse(cached) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null; // Fail gracefully
    }
  }
  
  async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't throw - caching is not critical
    }
  }
  
  async del(key: string | string[]): Promise<void> {
    try {
      if (Array.isArray(key)) {
        await redisClient.del(key);
      } else {
        await redisClient.del(key);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
  }
  
  // Cache-aside pattern helper
  async getOrSet<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Cache miss - fetch from source
    const data = await fetchFn();
    
    // Store in cache
    await this.set(key, data, ttl);
    
    return data;
  }
}

export default new CacheService();
```

### Cache Usage in Services

```typescript
// services/kpiService.ts

import cacheService from './cacheService';
import { CacheKeys, CacheTTL } from '../utils/cacheKeys';

export const getKPIMetrics = async (dateRange: string = 'today') => {
  const cacheKey = CacheKeys.kpiMetrics(dateRange);
  
  return cacheService.getOrSet(
    cacheKey,
    CacheTTL.KPI_METRICS,
    async () => {
      // Expensive database queries
      const [totalCatches, pending, approved, rejected] = await Promise.all([
        db.select({ count: count() })
          .from(catches)
          .where(eq(catches.createdAt, today)),
        db.select({ count: count() })
          .from(catches)
          .where(and(eq(catches.status, 'pending'), eq(catches.createdAt, today))),
        db.select({ count: count() })
          .from(catches)
          .where(and(eq(catches.status, 'approved'), eq(catches.createdAt, today))),
        db.select({ count: count() })
          .from(catches)
          .where(and(eq(catches.status, 'rejected'), eq(catches.createdAt, today)))
      ]);
      
      return {
        totalCatchesToday: totalCatches[0].count,
        pendingApprovals: pending[0].count,
        approvedToday: approved[0].count,
        rejectedToday: rejected[0].count
      };
    }
  );
};
```

### Cache Invalidation Strategy

```typescript
// services/catchService.ts

import cacheService from './cacheService';
import { CacheKeys } from '../utils/cacheKeys';

export const approveCatch = async (catchId: string, adminUserId: string) => {
  const result = await db.transaction(async (tx) => {
    // ... transaction logic ...
  });
  
  // Invalidate affected caches
  await Promise.all([
    cacheService.invalidatePattern('kpi:metrics:*'),
    cacheService.invalidatePattern('listings:*'),
    cacheService.del(CacheKeys.marketplaceStats()),
    cacheService.del(CacheKeys.quotas()),
    cacheService.del(CacheKeys.quotaBySpecies(result.catch.speciesId)),
    cacheService.del(CacheKeys.activityFeed())
  ]);
  
  // Publish SSE events
  SSEManager.publishEvent('catch:events', { ... });
  
  return result;
};
```

### Session Management with Redis

```typescript
// services/sessionService.ts

import cacheService from './cacheService';
import { CacheKeys, CacheTTL } from '../utils/cacheKeys';

export const createSession = async (userId: string, sessionData: any) => {
  const key = CacheKeys.session(userId);
  await cacheService.set(key, sessionData, CacheTTL.SESSION);
};

export const getSession = async (userId: string) => {
  const key = CacheKeys.session(userId);
  return cacheService.get(key);
};

export const destroySession = async (userId: string) => {
  const key = CacheKeys.session(userId);
  await cacheService.del(key);
};
```

### Refresh Token Storage

```typescript
// services/authService.ts

import cacheService from './cacheService';
import { CacheKeys, CacheTTL } from '../utils/cacheKeys';
import crypto from 'crypto';

export const generateRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(64).toString('hex');
  
  // Store in database
  await db.insert(refreshTokens).values({
    userId: userId,
    token: token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });
  
  // Also cache for fast lookup
  await cacheService.set(
    CacheKeys.refreshToken(token),
    { userId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 },
    CacheTTL.REFRESH_TOKEN
  );
  
  return token;
};

export const validateRefreshToken = async (token: string): Promise<string | null> => {
  // Try cache first
  const cached = await cacheService.get<{ userId: string; expiresAt: number }>(
    CacheKeys.refreshToken(token)
  );
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.userId;
  }
  
  // Fallback to database
  const [tokenRecord] = await db
    .select()
    .from(refreshTokens)
    .where(and(
      eq(refreshTokens.token, token),
      gt(refreshTokens.expiresAt, new Date())
    ));
  
  return tokenRecord?.userId || null;
};
```

### Cache Monitoring

```typescript
// services/metricsService.ts

let cacheHits = 0;
let cacheMisses = 0;

export const recordCacheHit = () => {
  cacheHits++;
};

export const recordCacheMiss = () => {
  cacheMisses++;
};

export const getCacheMetrics = () => {
  const total = cacheHits + cacheMisses;
  const hitRate = total > 0 ? (cacheHits / total) * 100 : 0;
  
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: hitRate.toFixed(2)
  };
};
```


## Frontend Architecture

### State Management Strategy

**TanStack Query** for server state:
- Automatic caching and background refetching
- Optimistic updates
- SSE-triggered invalidation
- Request deduplication

**React Context** for auth state:
- User information
- Access token (in memory)
- Role-based UI rendering

**Local State** for UI interactions:
- Form inputs
- Modal visibility
- Filter selections

### Fisher App Component Design

#### Component Tree

```
FisherApp
├── AuthProvider
│   └── Router
│       ├── LoginPage
│       ├── Layout
│       │   ├── Header (with notifications badge)
│       │   ├── Navigation
│       │   └── Outlet
│       │       ├── HomePage
│       │       │   ├── LicenseStatusCard
│       │       │   ├── TodaySummaryCard
│       │       │   └── QuickActionButtons
│       │       ├── CatchSubmissionPage
│       │       │   └── CatchWizard
│       │       │       ├── BasicInfoStep
│       │       │       ├── PhotosStep
│       │       │       ├── LocationStep
│       │       │       └── ReviewStep
│       │       ├── MyCatchesPage
│       │       │   ├── CatchFilters
│       │       │   ├── CatchList
│       │       │   │   └── CatchCard (status badge)
│       │       │   └── CatchDetailModal
│       │       ├── NotificationsPage
│       │       │   └── NotificationList
│       │       │       └── NotificationItem
│       │       ├── ZonesPage
│       │       │   ├── ZoneMap
│       │       │   └── ZoneList
│       │       └── ProfilePage
│       │           ├── ProfileInfo
│       │           ├── LicenseInfo
│       │           └── BoatInfo
│       └── SSEProvider (establishes SSE connection)
```

#### Key Components

**CatchWizard.tsx**
```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitCatch } from '../api/catches';

const catchSchema = z.object({
  speciesId: z.string().uuid(),
  zoneId: z.string().uuid(),
  weight: z.number().min(0.1).max(500),
  catchDate: z.string().refine((date) => new Date(date) <= new Date()),
  photos: z.array(z.string().url()).min(1).max(3)
});

type CatchFormData = z.infer<typeof catchSchema>;

export const CatchWizard = () => {
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<CatchFormData>({
    resolver: zodResolver(catchSchema)
  });
  
  const submitMutation = useMutation({
    mutationFn: submitCatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catches'] });
      // Navigate to My Catches
    }
  });
  
  const onSubmit = (data: CatchFormData) => {
    submitMutation.mutate({ ...data, photos });
  };
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <StepIndicator currentStep={step} totalSteps={4} />
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 && (
          <BasicInfoStep 
            register={register} 
            errors={errors}
            onNext={() => setStep(2)}
          />
        )}
        
        {step === 2 && (
          <PhotosStep
            photos={photos}
            setPhotos={setPhotos}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        
        {step === 3 && (
          <LocationStep
            register={register}
            errors={errors}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        
        {step === 4 && (
          <ReviewStep
            data={watch()}
            photos={photos}
            onSubmit={handleSubmit(onSubmit)}
            onBack={() => setStep(3)}
            isLoading={submitMutation.isPending}
          />
        )}
      </form>
    </div>
  );
};
```

**CatchList.tsx**
```typescript
import { useQuery } from '@tanstack/react-query';
import { getCatches } from '../api/catches';
import { useSSE } from '../hooks/useSSE';

export const CatchList = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['catches'],
    queryFn: getCatches
  });
  
  // SSE will automatically invalidate this query when catches update
  useSSE();
  
  if (isLoading) return <LoadingSkeleton />;
  
  return (
    <div className="space-y-4">
      {data?.catches.map((catch) => (
        <CatchCard key={catch.id} catch={catch} />
      ))}
    </div>
  );
};
```

**CatchCard.tsx**
```typescript
interface CatchCardProps {
  catch: Catch;
}

export const CatchCard = ({ catch: catchData }: CatchCardProps) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{catchData.species.name}</h3>
          <p className="text-gray-600">{catchData.zone.name}</p>
          <p className="text-gray-800 font-medium">{catchData.weight} kg</p>
          <p className="text-sm text-gray-500">
            {new Date(catchData.catchDate).toLocaleDateString()}
          </p>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[catchData.status]}`}>
          {catchData.status}
        </span>
      </div>
      
      {catchData.photos.length > 0 && (
        <img 
          src={catchData.photos[0]} 
          alt="Catch" 
          className="mt-3 w-full h-48 object-cover rounded"
        />
      )}
      
      {catchData.status === 'rejected' && catchData.rejectionReason && (
        <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
          <p className="text-sm text-red-800">
            <strong>Rejection Reason:</strong> {catchData.rejectionReason}
          </p>
        </div>
      )}
    </div>
  );
};
```

### Admin Dashboard Component Design

#### Component Tree

```
AdminDashboard
├── AuthProvider
│   └── Router
│       ├── LoginPage
│       ├── Layout
│       │   ├── Sidebar (navigation)
│       │   ├── Header (alerts badge)
│       │   └── Outlet
│       │       ├── DashboardPage
│       │       │   ├── KPICards (4-column grid)
│       │       │   ├── QuotaPanel
│       │       │   │   └── QuotaBar (per species)
│       │       │   ├── CatchesBySpeciesChart
│       │       │   ├── CatchesByZoneChart
│       │       │   └── RecentCatchesList
│       │       ├── CatchesPage
│       │       │   ├── CatchFilters
│       │       │   ├── CatchTable (sortable, paginated)
│       │       │   └── CatchDetailModal
│       │       │       ├── CatchInfo
│       │       │       ├── FisherInfo
│       │       │       ├── PhotoGallery
│       │       │       └── ApprovalActions
│       │       ├── FishersPage
│       │       │   ├── FisherFilters
│       │       │   └── FisherTable
│       │       ├── QuotasPage
│       │       │   ├── QuotaList
│       │       │   └── QuotaEditModal (super_admin only)
│       │       ├── AlertsPage
│       │       │   └── AlertList
│       │       │       └── AlertCard
│       │       └── UsersPage (super_admin only)
│       │           ├── UserFilters
│       │           ├── UserTable
│       │           └── UserCreateModal
│       └── SSEProvider
```

#### Key Components

**DashboardOverview.tsx**
```typescript
import { useQuery } from '@tanstack/react-query';
import { getKPIMetrics, getQuotas } from '../api/admin';
import { useSSE } from '../hooks/useSSE';

export const DashboardOverview = () => {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['kpis', 'today'],
    queryFn: () => getKPIMetrics('today'),
    refetchInterval: 300000 // Refetch every 5 minutes
  });
  
  const { data: quotas, isLoading: quotasLoading } = useQuery({
    queryKey: ['quotas'],
    queryFn: getQuotas
  });
  
  useSSE(); // Auto-invalidates queries on SSE events
  
  if (kpisLoading || quotasLoading) return <LoadingSkeleton />;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KPICard 
          title="Total Catches Today" 
          value={kpis.totalCatchesToday}
          icon={<FishIcon />}
        />
        <KPICard 
          title="Pending Approvals" 
          value={kpis.pendingApprovals}
          icon={<ClockIcon />}
          variant="warning"
        />
        <KPICard 
          title="Approved Today" 
          value={kpis.approvedToday}
          icon={<CheckIcon />}
          variant="success"
        />
        <KPICard 
          title="Rejected Today" 
          value={kpis.rejectedToday}
          icon={<XIcon />}
          variant="danger"
        />
      </div>
      
      <QuotaPanel quotas={quotas.quotas} />
      
      <div className="grid grid-cols-2 gap-6">
        <CatchesBySpeciesChart data={kpis.catchesBySpecies} />
        <CatchesByZoneChart data={kpis.catchesByZone} />
      </div>
      
      <RecentCatchesList catches={kpis.recentCatches} />
    </div>
  );
};
```

**QuotaPanel.tsx**
```typescript
interface QuotaPanelProps {
  quotas: Quota[];
}

export const QuotaPanel = ({ quotas }: QuotaPanelProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Species Quotas</h2>
      
      <div className="space-y-4">
        {quotas.map((quota) => (
          <QuotaBar key={quota.id} quota={quota} />
        ))}
      </div>
    </div>
  );
};

interface QuotaBarProps {
  quota: Quota;
}

export const QuotaBar = ({ quota }: QuotaBarProps) => {
  const percentage = quota.percentageUsed;
  
  const getColor = () => {
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-medium">{quota.species.name}</span>
        <span className="text-sm text-gray-600">
          {quota.consumedKg.toFixed(1)} / {quota.limitKg.toFixed(1)} kg
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className={`h-3 rounded-full transition-all ${getColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-500">
          {percentage.toFixed(1)}% used
        </span>
        {percentage >= 80 && (
          <span className="text-xs font-medium text-red-600">
            {percentage >= 100 ? 'EXCEEDED' : 'WARNING'}
          </span>
        )}
      </div>
    </div>
  );
};
```

**CatchDetailModal.tsx**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveCatch, rejectCatch } from '../api/admin';

interface CatchDetailModalProps {
  catchId: string;
  onClose: () => void;
}

export const CatchDetailModal = ({ catchId, onClose }: CatchDetailModalProps) => {
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  const { data: catchData, isLoading } = useQuery({
    queryKey: ['catch', catchId],
    queryFn: () => getCatchDetail(catchId)
  });
  
  const approveMutation = useMutation({
    mutationFn: () => approveCatch(catchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catches'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      onClose();
    }
  });
  
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectCatch(catchId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catches'] });
      onClose();
    }
  });
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <Modal onClose={onClose} size="large">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Catch Details</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <PhotoGallery photos={catchData.photos} />
            
            <div className="mt-4 space-y-2">
              <InfoRow label="Species" value={catchData.species.name} />
              <InfoRow label="Zone" value={catchData.zone.name} />
              <InfoRow label="Weight" value={`${catchData.weight} kg`} />
              <InfoRow label="Catch Date" value={new Date(catchData.catchDate).toLocaleDateString()} />
              <InfoRow label="Submitted" value={new Date(catchData.createdAt).toLocaleString()} />
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-3">Fisher Information</h3>
            <div className="space-y-2">
              <InfoRow label="Name" value={`${catchData.fisher.firstName} ${catchData.fisher.lastName}`} />
              <InfoRow label="License" value={catchData.fisher.licenseNumber} />
              <InfoRow label="Phone" value={catchData.fisher.phone} />
              <InfoRow 
                label="License Expiry" 
                value={new Date(catchData.fisher.licenseExpiryDate).toLocaleDateString()}
                variant={new Date(catchData.fisher.licenseExpiryDate) < new Date() ? 'danger' : 'default'}
              />
            </div>
            
            {catchData.status === 'pending' && (
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {approveMutation.isPending ? 'Approving...' : 'Approve Catch'}
                </button>
                
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={rejectMutation.isPending}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Reject Catch
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showRejectModal && (
        <RejectModal
          onConfirm={(reason) => {
            rejectMutation.mutate(reason);
            setShowRejectModal(false);
          }}
          onCancel={() => setShowRejectModal(false)}
        />
      )}
    </Modal>
  );
};
```


### Marketplace Component Design

#### Component Tree

```
Marketplace
├── AuthProvider (optional - browse without auth)
│   └── Router
│       ├── HomePage
│       │   ├── Hero
│       │   ├── FeaturedListings
│       │   └── TrustBadges
│       ├── Layout
│       │   ├── Header (with cart/orders link)
│       │   ├── Navigation
│       │   └── Outlet
│       │       ├── BrowsePage
│       │       │   ├── FilterSidebar
│       │       │   │   ├── SpeciesFilter
│       │       │   │   ├── ZoneFilter
│       │       │   │   ├── PriceRangeFilter
│       │       │   │   └── DateFilter
│       │       │   ├── ListingGrid
│       │       │   │   └── ListingCard
│       │       │   └── RightSidebar
│       │       │       ├── MarketStats
│       │       │       └── ActivityFeed
│       │       ├── ListingDetailPage
│       │       │   ├── PhotoGallery
│       │       │   ├── ListingInfo
│       │       │   ├── FisherBadge
│       │       │   └── OrderForm
│       │       ├── MyOrdersPage
│       │       │   ├── OrderFilters
│       │       │   └── OrderList
│       │       │       └── OrderCard
│       │       ├── LoginPage
│       │       └── RegisterPage
│       └── SSEProvider
```

#### Key Components

**ListingGrid.tsx**
```typescript
import { useQuery } from '@tanstack/react-query';
import { getListings } from '../api/marketplace';
import { useSSE } from '../hooks/useSSE';
import { useSearchParams } from 'react-router-dom';

export const ListingGrid = () => {
  const [searchParams] = useSearchParams();
  
  const filters = {
    speciesId: searchParams.get('speciesId'),
    zoneId: searchParams.get('zoneId'),
    minPrice: searchParams.get('minPrice'),
    maxPrice: searchParams.get('maxPrice'),
    sortBy: searchParams.get('sortBy') || 'newest'
  };
  
  const { data, isLoading } = useQuery({
    queryKey: ['listings', filters],
    queryFn: () => getListings(filters)
  });
  
  useSSE(); // Auto-refresh on new listings
  
  if (isLoading) return <LoadingGrid />;
  
  if (data?.listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No listings found</p>
        <p className="text-gray-400 mt-2">Try adjusting your filters</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data?.listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
};
```

**ListingCard.tsx**
```typescript
import { Link } from 'react-router-dom';

interface ListingCardProps {
  listing: Listing;
}

export const ListingCard = ({ listing }: ListingCardProps) => {
  return (
    <Link to={`/listings/${listing.id}`}>
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
        <div className="relative">
          <img 
            src={listing.photos[0]} 
            alt={listing.species.name}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <CheckCircleIcon className="w-4 h-4" />
            Verified
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg">{listing.species.name}</h3>
          <p className="text-sm text-gray-600">{listing.zone.name}</p>
          
          <div className="mt-3 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Available</p>
              <p className="font-medium">{listing.availableQuantity} kg</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Price</p>
              <p className="font-bold text-lg text-green-600">
                ETB {listing.pricePerKg}/kg
              </p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Caught {new Date(listing.catchDate).toLocaleDateString()}
            </span>
            <span className="text-gray-600">
              By {listing.fisher.firstName}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
```

**ListingDetailPage.tsx**
```typescript
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getListingDetail, placeOrder } from '../api/marketplace';
import { useAuth } from '../contexts/AuthContext';

export const ListingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [quantity, setQuantity] = useState(1);
  
  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListingDetail(id!)
  });
  
  const orderMutation = useMutation({
    mutationFn: () => placeOrder(id!, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      navigate('/orders');
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        alert('Insufficient quantity available');
      }
    }
  });
  
  if (isLoading) return <LoadingSpinner />;
  if (!listing) return <NotFound />;
  
  const totalPrice = quantity * listing.pricePerKg;
  const canOrder = user?.role === 'buyer' && quantity <= listing.availableQuantity;
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <PhotoGallery photos={listing.photos} />
        </div>
        
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{listing.species.name}</h1>
              <p className="text-gray-600 mt-1">{listing.species.scientificName}</p>
            </div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <CheckCircleIcon className="w-4 h-4" />
              Verified Fisher
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            <InfoRow label="Zone" value={listing.zone.name} />
            <InfoRow label="Catch Date" value={new Date(listing.catchDate).toLocaleDateString()} />
            <InfoRow label="Available Quantity" value={`${listing.availableQuantity} kg`} />
            <InfoRow label="Fisher" value={listing.fisher.firstName} />
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Price per kg</span>
              <span className="text-2xl font-bold text-green-600">
                ETB {listing.pricePerKg}
              </span>
            </div>
          </div>
          
          <div className="mt-6 p-6 bg-white border-2 border-gray-200 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Place Order</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (kg)
                </label>
                <input
                  type="number"
                  min="0.5"
                  max={listing.availableQuantity}
                  step="0.5"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium">Total Price</span>
                <span className="font-bold text-green-600">
                  ETB {totalPrice.toFixed(2)}
                </span>
              </div>
              
              {!user ? (
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium"
                >
                  Login to Order
                </button>
              ) : user.role !== 'buyer' ? (
                <p className="text-sm text-red-600">
                  Only registered buyers can place orders
                </p>
              ) : (
                <button
                  onClick={() => orderMutation.mutate()}
                  disabled={!canOrder || orderMutation.isPending}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {orderMutation.isPending ? 'Placing Order...' : 'Place Order'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**MarketStats.tsx**
```typescript
import { useQuery } from '@tanstack/react-query';
import { getMarketplaceStats } from '../api/marketplace';
import { useSSE } from '../hooks/useSSE';

export const MarketStats = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-stats'],
    queryFn: getMarketplaceStats,
    refetchInterval: 180000 // Refetch every 3 minutes
  });
  
  useSSE(); // Auto-refresh on orders/listings
  
  if (isLoading) return <LoadingSkeleton />;
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-lg mb-4">Market Statistics</h3>
      
      <div className="space-y-3">
        <StatRow 
          label="Active Listings" 
          value={data.activeListings}
          icon={<ListIcon />}
        />
        <StatRow 
          label="Orders Today" 
          value={data.ordersToday}
          icon={<ShoppingCartIcon />}
        />
        <StatRow 
          label="Weight Sold Today" 
          value={`${data.totalWeightSoldToday} kg`}
          icon={<ScaleIcon />}
        />
        <StatRow 
          label="Avg Price" 
          value={`ETB ${data.averagePricePerKg}/kg`}
          icon={<CurrencyIcon />}
        />
      </div>
    </div>
  );
};
```

**ActivityFeed.tsx**
```typescript
import { useQuery } from '@tanstack/react-query';
import { getActivityFeed } from '../api/marketplace';
import { useSSE } from '../hooks/useSSE';
import { formatDistanceToNow } from 'date-fns';

export const ActivityFeed = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: getActivityFeed
  });
  
  useSSE(); // Real-time activity updates
  
  if (isLoading) return <LoadingSkeleton />;
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mt-4">
      <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
      
      <div className="space-y-3">
        {data?.activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 text-sm">
            <div className="mt-1">
              {activity.type === 'listing_created' ? (
                <PlusCircleIcon className="w-5 h-5 text-green-600" />
              ) : (
                <ShoppingBagIcon className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-gray-800">{activity.description}</p>
              <p className="text-gray-500 text-xs mt-1">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```


## Error Handling and Logging

### Error Classification

```typescript
// utils/errors.ts

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, false); // Not operational
  }
}
```

### Global Error Handler Middleware

```typescript
// middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    ip: req.ip
  });
  
  // Operational errors (expected)
  if (error instanceof AppError && error.isOperational) {
    return res.status(error.statusCode).json({
      error: error.message,
      ...(error instanceof ValidationError && error.fields ? { fields: error.fields } : {})
    });
  }
  
  // Programming errors (unexpected)
  // Don't leak error details to client
  return res.status(500).json({
    error: 'An unexpected error occurred. Please try again later.'
  });
};

// Async handler wrapper to catch promise rejections
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

### Input Validation with Zod

```typescript
// middleware/validation.ts

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fields: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fields[path] = err.message;
        });
        throw new ValidationError('Validation failed', fields);
      }
      next(error);
    }
  };
};

// Example schemas
export const catchSubmissionSchema = z.object({
  speciesId: z.string().uuid('Invalid species ID'),
  zoneId: z.string().uuid('Invalid zone ID'),
  weight: z.number()
    .min(0.1, 'Weight must be at least 0.1 kg')
    .max(500, 'Weight cannot exceed 500 kg'),
  catchDate: z.string()
    .refine((date) => new Date(date) <= new Date(), 'Catch date cannot be in the future'),
  photos: z.array(z.string().url())
    .min(1, 'At least 1 photo is required')
    .max(3, 'Maximum 3 photos allowed')
});

export const orderSchema = z.object({
  listingId: z.string().uuid('Invalid listing ID'),
  quantity: z.number()
    .min(0.5, 'Minimum order quantity is 0.5 kg')
});
```

### Structured Logging with Winston

```typescript
// utils/logger.ts

import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console logging
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File logging - errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 14 // 14 days retention
    }),
    
    // File logging - all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 20 * 1024 * 1024,
      maxFiles: 14
    })
  ]
});

// HTTP request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
};
```

### Security Headers and Rate Limiting

```typescript
// middleware/security.ts

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.userId || req.ip;
  }
});

// Stricter rate limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true
});
```

### CORS Configuration

```typescript
// middleware/cors.ts

import cors from 'cors';

const allowedOrigins = [
  'http://localhost:3001', // Admin Dashboard
  'http://localhost:3002', // Fisher App
  'http://localhost:3003', // Marketplace
  process.env.ADMIN_DASHBOARD_URL,
  process.env.FISHER_APP_URL,
  process.env.MARKETPLACE_URL
].filter(Boolean);

export const corsOptions = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authentication Token Generation

*For any* valid fisher credentials (license number and password), when authentication succeeds, the Backend API SHALL generate both a JWT access token and a refresh token with correct structure and expiration times.

**Validates: Requirements 1.2, 1.4**

### Property 2: Row-Level Security Enforcement

*For any* fisher user and any catch record in the system, the fisher SHALL only be able to access catch records where the fisher_id matches their own user's associated fisher record.

**Validates: Requirements 1.9**

### Property 3: Catch Weight Validation

*For any* weight input submitted in a catch form, the system SHALL accept values in the range [0.1, 500] kilograms and reject all values outside this range with a validation error.

**Validates: Requirements 2.2, 20.5**

### Property 4: Catch Creation Status

*For any* valid catch submission, when the Backend API creates a catch record, the initial status SHALL always be "pending" regardless of the fisher, species, or zone.

**Validates: Requirements 2.8**

### Property 5: License Expiry Validation

*For any* catch submission attempt, if the fisher's license expiry date is in the past, the Backend API SHALL reject the submission with an authorization error.

**Validates: Requirements 2.9**

### Property 6: SSE Event Filtering

*For any* fisher user connected to the SSE channel and any catch status update event, the fisher SHALL only receive events for catches where the fisher_id matches their own fisher record.

**Validates: Requirements 3.8**

### Property 7: Catch Approval Transaction Atomicity

*For any* catch approval operation, the system SHALL execute all four operations (update catch status, create listing, create notification, update quota) within a single transaction such that either all operations succeed or all operations are rolled back.

**Validates: Requirements 6.9, 16.1**

### Property 8: Catch Rejection Transaction Atomicity

*For any* catch rejection operation with a valid reason, the system SHALL execute all three operations (update catch status, store rejection reason, create notification) within a single transaction such that either all operations succeed or all operations are rolled back.

**Validates: Requirements 6.10**

### Property 9: Quota Increment on Approval

*For any* approved catch, the species quota consumed amount SHALL increase by exactly the catch weight within the same transaction as the approval.

**Validates: Requirements 7.3**

### Property 10: Listing Auto-Creation

*For any* catch record that transitions from "pending" to "approved" status, the system SHALL create exactly one marketplace listing linked to that catch within the same transaction.

**Validates: Requirements 9.1, 9.10**

### Property 11: One-to-One Catch-Listing Relationship

*For any* catch record in the system, there SHALL exist at most one marketplace listing with that catch_id, enforced by a database UNIQUE constraint.

**Validates: Requirements 9.10**

### Property 12: Order Placement Transaction Atomicity

*For any* order placement operation, the system SHALL execute all four operations (create order, update listing quantity, update listing status if sold out, create notification) within a single transaction such that either all operations succeed or all operations are rolled back.

**Validates: Requirements 11.10**

### Property 13: Database Constraint Enforcement

*For any* attempt to insert or update records with invalid values (catch weight ≤ 0, quota limit ≤ 0, listing price ≤ 0, order quantity ≤ 0), the database SHALL reject the operation with a CHECK constraint violation.

**Validates: Requirements 15.5**

### Property 14: Transaction Rollback on Failure

*For any* database transaction where any operation fails, the system SHALL roll back all changes made within that transaction, ensuring no partial state persists.

**Validates: Requirements 16.4**

### Property 15: Photo URL Storage

*For any* catch submission with uploaded photos, the database SHALL store Cloudinary secure URLs (strings) in the photos field, not raw file data.

**Validates: Requirements 17.6**

### Property 16: Password Hashing

*For any* user registration or password change operation, the system SHALL hash the password using bcrypt with a cost factor of 12 before storing it in the database.

**Validates: Requirements 21.1**

### Property 17: JWT Token Validation

*For any* request to a protected endpoint, the Backend API SHALL validate the JWT token signature and expiration before processing the request, rejecting invalid or expired tokens with a 401 error.

**Validates: Requirements 21.9**

### Property 18: Catch Status Idempotence

*For any* catch record that has already been approved or rejected, subsequent approval or rejection attempts SHALL fail with a conflict error, preventing duplicate processing.

**Validates: Requirements 6.9 (implicit), 16.10**

### Property 19: Listing Quantity Consistency

*For any* order placement, the listing's available quantity SHALL decrease by exactly the order quantity, and if the new quantity equals zero, the listing status SHALL change to "sold".

**Validates: Requirements 11.10**

### Property 20: Audit Log Immutability

*For any* audit log record, attempts to UPDATE or DELETE the record SHALL be prevented by database triggers, ensuring audit trail integrity.

**Validates: Requirements 22.8**


## Deployment Architecture

### Docker Compose Configuration

```yaml
# docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: assa-postgres
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: assa-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile
    container_name: assa-backend
    environment:
      NODE_ENV: development
      PORT: 5000
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./apps/backend:/app
      - /app/node_modules
    command: npm run dev

  fisher-app:
    build:
      context: ./apps/fisher-app
      dockerfile: Dockerfile
    container_name: assa-fisher-app
    environment:
      VITE_API_URL: http://localhost:5000/api/v1
    ports:
      - "3002:3002"
    volumes:
      - ./apps/fisher-app:/app
      - /app/node_modules
    command: npm run dev

  admin-dashboard:
    build:
      context: ./apps/admin-dashboard
      dockerfile: Dockerfile
    container_name: assa-admin-dashboard
    environment:
      VITE_API_URL: http://localhost:5000/api/v1
    ports:
      - "3001:3001"
    volumes:
      - ./apps/admin-dashboard:/app
      - /app/node_modules
    command: npm run dev

  marketplace:
    build:
      context: ./apps/marketplace
      dockerfile: Dockerfile
    container_name: assa-marketplace
    environment:
      VITE_API_URL: http://localhost:5000/api/v1
    ports:
      - "3003:3003"
    volumes:
      - ./apps/marketplace:/app
      - /app/node_modules
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
```

### Environment Variables

```bash
# .env.example

# Database
DB_NAME=assa_fisheries
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://postgres:your_secure_password_here@localhost:5432/assa_fisheries

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Server
NODE_ENV=development
PORT=5000
LOG_LEVEL=info

# Frontend URLs (for CORS)
ADMIN_DASHBOARD_URL=http://localhost:3001
FISHER_APP_URL=http://localhost:3002
MARKETPLACE_URL=http://localhost:3003

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_SECRET=your_session_secret_here
```

### Backend Dockerfile

```dockerfile
# apps/backend/Dockerfile

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
```

### Frontend Dockerfile (same for all three apps)

```dockerfile
# apps/fisher-app/Dockerfile (similar for admin-dashboard and marketplace)

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3002

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### Database Migration Strategy

```typescript
// apps/backend/src/db/migrate.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool);

async function runMigrations() {
  console.log('Running migrations...');
  
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  
  console.log('Migrations completed successfully');
  await pool.end();
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
```

### Seed Data Script

```typescript
// apps/backend/src/db/seed.ts

import { db } from './index';
import { users, fishers, species, zones, quotas, catches, listings } from './schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding database...');
  
  // 1. Create species
  const speciesData = [
    { name: 'Tilapia', scientificName: 'Oreochromis niloticus', referencePricePerKg: 140 },
    { name: 'Catfish', scientificName: 'Clarias gariepinus', referencePricePerKg: 160 },
    { name: 'Barbus', scientificName: 'Labeobarbus intermedius', referencePricePerKg: 130 },
    { name: 'Labeobarbus', scientificName: 'Labeobarbus megastoma', referencePricePerKg: 150 },
    { name: 'Clarias', scientificName: 'Clarias sp.', referencePricePerKg: 155 },
    { name: 'Oreochromis', scientificName: 'Oreochromis sp.', referencePricePerKg: 145 }
  ];
  
  const createdSpecies = await db.insert(species).values(speciesData).returning();
  console.log(`Created ${createdSpecies.length} species`);
  
  // 2. Create zones
  const zonesData = [
    { name: 'North Zone', restrictions: 'No fishing during breeding season (May-July)' },
    { name: 'South Zone', restrictions: 'Maximum 100kg per day' },
    { name: 'East Zone', restrictions: 'Licensed boats only' },
    { name: 'West Zone', restrictions: 'No night fishing' },
    { name: 'Central Zone', restrictions: 'Protected area - limited access' },
    { name: 'Bahir Dar Bay', restrictions: 'Tourist area - daylight hours only' }
  ];
  
  const createdZones = await db.insert(zones).values(zonesData).returning();
  console.log(`Created ${createdZones.length} zones`);
  
  // 3. Create quotas
  const quotasData = createdSpecies.map((sp) => ({
    speciesId: sp.id,
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-12-31'),
    limitKg: 50000,
    consumedKg: Math.random() * 30000 // Random consumption 0-60%
  }));
  
  await db.insert(quotas).values(quotasData);
  console.log(`Created ${quotasData.length} quotas`);
  
  // 4. Create admin users
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  
  const adminUsers = await db.insert(users).values([
    { email: 'admin@assa.gov.et', passwordHash: adminPassword, role: 'admin', region: 'Amhara' },
    { email: 'superadmin@assa.gov.et', passwordHash: adminPassword, role: 'super_admin' },
    { email: 'officer@assa.gov.et', passwordHash: adminPassword, role: 'field_officer', region: 'Amhara' }
  ]).returning();
  
  console.log(`Created ${adminUsers.length} admin users`);
  
  // 5. Create fisher users and fisher profiles
  const fisherPassword = await bcrypt.hash('Fisher123!', 12);
  const ethiopianNames = [
    ['Tesfaye', 'Alemu'], ['Dawit', 'Bekele'], ['Mulugeta', 'Haile'],
    ['Girma', 'Tadesse'], ['Kebede', 'Mengistu'], ['Abebe', 'Wolde']
  ];
  
  for (let i = 0; i < 50; i++) {
    const [firstName, lastName] = ethiopianNames[i % ethiopianNames.length];
    
    const [user] = await db.insert(users).values({
      email: `fisher${i + 1}@example.com`,
      passwordHash: fisherPassword,
      role: 'fisher',
      region: 'Amhara'
    }).returning();
    
    await db.insert(fishers).values({
      userId: user.id,
      licenseNumber: `FSH-2024-${String(i + 1).padStart(5, '0')}`,
      firstName: `${firstName}${i > 5 ? i : ''}`,
      lastName: lastName,
      phone: `+251911${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
      region: 'Amhara',
      licenseIssuedDate: new Date('2024-01-01'),
      licenseExpiryDate: new Date('2024-12-31')
    });
  }
  
  console.log('Created 50 fisher users');
  
  // 6. Create sample catches and listings
  const allFishers = await db.select().from(fishers);
  
  for (let i = 0; i < 200; i++) {
    const fisher = allFishers[Math.floor(Math.random() * allFishers.length)];
    const sp = createdSpecies[Math.floor(Math.random() * createdSpecies.length)];
    const zone = createdZones[Math.floor(Math.random() * createdZones.length)];
    
    const status = i < 150 ? 'approved' : (i < 180 ? 'pending' : 'rejected');
    const weight = Math.random() * 50 + 5; // 5-55 kg
    
    const [catchRecord] = await db.insert(catches).values({
      fisherId: fisher.id,
      speciesId: sp.id,
      zoneId: zone.id,
      weight: weight,
      catchDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
      photos: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
      status: status,
      rejectionReason: status === 'rejected' ? 'Photo quality insufficient' : null
    }).returning();
    
    // Create listing for approved catches
    if (status === 'approved') {
      await db.insert(listings).values({
        catchId: catchRecord.id,
        pricePerKg: sp.referencePricePerKg * 1.1,
        availableQuantity: weight,
        status: 'available'
      });
    }
  }
  
  console.log('Created 200 catches and listings');
  console.log('Seeding completed successfully!');
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
```

### Performance Optimization Checklist

1. **Database Optimization**
   - ✅ Indexes on frequently queried columns
   - ✅ Composite indexes for complex queries
   - ✅ Connection pooling (10-50 connections)
   - ✅ Query optimization with EXPLAIN ANALYZE
   - ✅ Pagination for large result sets

2. **Caching Strategy**
   - ✅ Redis caching with appropriate TTLs
   - ✅ Cache invalidation on data mutations
   - ✅ Cache-aside pattern implementation
   - ✅ Session storage in Redis

3. **API Performance**
   - ✅ Response time targets: GET <400ms, POST <600ms (p95)
   - ✅ Request timeout: 30 seconds
   - ✅ Rate limiting: 100 req/15min per user
   - ✅ Compression middleware (gzip)

4. **Frontend Optimization**
   - ✅ Code splitting and lazy loading
   - ✅ Image optimization via Cloudinary
   - ✅ TanStack Query caching
   - ✅ Debounced search inputs
   - ✅ Virtual scrolling for long lists

5. **Real-Time Performance**
   - ✅ SSE keep-alive every 30 seconds
   - ✅ Event filtering at server level
   - ✅ Redis pub/sub for event distribution
   - ✅ Automatic reconnection with backoff


## Testing Strategy

### Unit Testing

**Backend Services** (Vitest):
- Business logic in service layer
- Utility functions
- Validation schemas
- Error handling

**Frontend Components** (Vitest + React Testing Library):
- Component rendering
- User interactions
- Form validation
- State management

### Integration Testing

**API Endpoints** (Supertest):
- Request/response validation
- Authentication flows
- Authorization checks
- Error responses

**Database Operations**:
- Transaction atomicity
- Constraint enforcement
- Trigger functionality

### Property-Based Testing

**Critical Business Logic** (fast-check):
- Authentication token generation (Property 1)
- Row-level security (Property 2)
- Input validation (Properties 3, 5)
- Transaction atomicity (Properties 7, 8, 12, 14)
- Quota calculations (Property 9)
- Listing creation (Properties 10, 11)
- Password hashing (Property 16)

Each property test should run a minimum of 100 iterations to ensure comprehensive coverage.

### End-to-End Testing

**Critical User Flows** (Playwright):
1. Fisher submits catch → Admin approves → Listing appears in marketplace
2. Buyer places order → Listing quantity updates → Fisher receives notification
3. Admin rejects catch → Fisher receives notification with reason
4. Quota threshold reached → Alert created → Admin sees warning

### Performance Testing

**Load Testing** (k6):
- 100 concurrent users
- API response times at p95
- Database query performance
- SSE connection stability

### Security Testing

**OWASP Top 10 Validation**:
- SQL injection prevention
- XSS prevention
- CSRF protection
- Authentication bypass attempts
- Authorization escalation attempts

## Monitoring and Observability

### Health Checks

```typescript
// GET /api/v1/health

{
  status: 'healthy',
  timestamp: '2024-05-15T10:30:00Z',
  services: {
    database: 'connected',
    redis: 'connected',
    cloudinary: 'configured'
  },
  uptime: 86400 // seconds
}
```

### Metrics Endpoint

```typescript
// GET /api/v1/metrics (admin only)

{
  uptime: 86400,
  requestCount: 15234,
  errorCount: 23,
  averageResponseTime: 245, // milliseconds
  cacheHitRate: 78.5, // percentage
  activeSSEConnections: 42,
  databaseConnections: {
    active: 8,
    idle: 12,
    total: 20
  }
}
```

### Logging Strategy

**Log Levels**:
- **ERROR**: Application errors, transaction failures, external service failures
- **WARN**: Quota thresholds, rate limit hits, slow queries
- **INFO**: HTTP requests, authentication events, business operations
- **DEBUG**: Detailed execution flow (development only)

**Structured Log Format**:
```json
{
  "timestamp": "2024-05-15T10:30:00.123Z",
  "level": "info",
  "message": "HTTP Request",
  "method": "POST",
  "path": "/api/v1/fisher/catches",
  "statusCode": 201,
  "duration": "234ms",
  "userId": "uuid",
  "ip": "192.168.1.1"
}
```

## Disaster Recovery

### Backup Strategy

**Database Backups**:
- Automated daily backups at 02:00 UTC
- 30-day retention period
- Point-in-time recovery capability
- Backup verification weekly

**Redis Persistence**:
- AOF (Append-Only File) enabled
- Snapshot every 60 seconds if 1000+ keys changed
- Backup to separate storage

### Recovery Procedures

**Database Failure**:
1. Detect failure via health check
2. Attempt automatic reconnection (3 retries)
3. If persistent, restore from latest backup
4. Replay transaction logs for point-in-time recovery
5. Verify data integrity
6. Resume operations

**Redis Failure**:
1. Detect failure via health check
2. Fallback to direct database queries
3. Attempt Redis reconnection
4. Restore from AOF/snapshot
5. Resume caching operations

**Complete System Failure**:
1. Provision new infrastructure
2. Restore database from backup
3. Restore Redis from snapshot
4. Deploy latest application version
5. Run smoke tests
6. Resume operations

## Summary

This design document provides a comprehensive technical blueprint for the ASSA Smart Fisheries System. The architecture emphasizes:

1. **Data Integrity**: All critical operations execute within database transactions with proper rollback handling
2. **Real-Time Synchronization**: Server-Sent Events ensure immediate UI updates across all three modules
3. **Security**: Multi-layered authentication, authorization, and audit logging
4. **Performance**: Strategic caching, database optimization, and connection pooling
5. **Scalability**: Stateless backend design, Redis pub/sub for horizontal scaling
6. **Maintainability**: Clear separation of concerns, structured logging, comprehensive error handling

The system is designed to handle the complete lifecycle of fish catch verification and marketplace transactions, from fisher submission through government approval to buyer purchase, with full traceability and compliance at every step.

### Key Design Decisions

1. **Monorepo Structure**: Simplifies shared type definitions and cross-module development
2. **PostgreSQL**: Provides ACID guarantees, complex queries, and referential integrity
3. **Redis**: Enables fast caching and real-time event distribution
4. **SSE over WebSockets**: Simpler implementation for unidirectional server-to-client updates
5. **TanStack Query**: Automatic caching, background refetching, and optimistic updates
6. **Drizzle ORM**: Type-safe database queries with excellent TypeScript integration
7. **Transaction-First Approach**: Ensures data consistency for all critical operations

### Next Steps

1. Set up development environment using Docker Compose
2. Implement database schema and migrations
3. Build backend API with authentication and core endpoints
4. Develop Fisher App catch submission flow
5. Implement Admin Dashboard approval workflow
6. Create Marketplace browse and order functionality
7. Integrate SSE for real-time updates
8. Write comprehensive tests (unit, integration, property-based)
9. Perform security audit and penetration testing
10. Deploy to staging environment for user acceptance testing

