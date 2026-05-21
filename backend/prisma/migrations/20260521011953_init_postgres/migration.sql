-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fishing_zones" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "geo_polygon" TEXT,

    CONSTRAINT "fishing_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fishers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "license_number" TEXT NOT NULL,
    "license_status" TEXT NOT NULL,
    "license_expiry" DATE NOT NULL,
    "zone_id" INTEGER,
    "profile_photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boats" (
    "id" SERIAL NOT NULL,
    "fisher_id" INTEGER NOT NULL,
    "boat_name" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "capacity_kg" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boat_trips" (
    "id" SERIAL NOT NULL,
    "boat_id" INTEGER NOT NULL,
    "fisher_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "boat_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boat_positions" (
    "id" SERIAL NOT NULL,
    "boat_id" INTEGER NOT NULL,
    "trip_id" INTEGER,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boat_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catch_submissions" (
    "id" SERIAL NOT NULL,
    "reference_id" TEXT NOT NULL,
    "fisher_id" INTEGER NOT NULL,
    "species" TEXT NOT NULL,
    "quantity_kg" DOUBLE PRECISION NOT NULL,
    "number_of_fish" INTEGER,
    "fishing_gear" TEXT NOT NULL,
    "fishing_date" DATE NOT NULL,
    "fishing_time" TEXT NOT NULL,
    "zone_id" INTEGER NOT NULL,
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "photo_urls" TEXT NOT NULL DEFAULT '[]',
    "zone_flag" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catch_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" SERIAL NOT NULL,
    "catch_id" INTEGER NOT NULL,
    "fisher_id" INTEGER NOT NULL,
    "species" TEXT NOT NULL,
    "quantity_available_kg" DOUBLE PRECISION NOT NULL,
    "price_per_kg" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "listed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "reference_id" TEXT NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "buyer_id" INTEGER NOT NULL,
    "quantity_kg" DOUBLE PRECISION NOT NULL,
    "price_per_kg" DOUBLE PRECISION NOT NULL,
    "total_price" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species_quotas" (
    "id" SERIAL NOT NULL,
    "species" TEXT NOT NULL,
    "monthly_limit_kg" DOUBLE PRECISION NOT NULL,
    "current_month_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "species_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "related_entity_type" TEXT,
    "related_entity_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "actor_user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" INTEGER,
    "payload_json" TEXT NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" SERIAL NOT NULL,
    "species" TEXT NOT NULL,
    "zone_id" INTEGER,
    "price_per_kg" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_snapshots" (
    "id" SERIAL NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "species" TEXT NOT NULL,
    "total_listed_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_sold_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_price" DOUBLE PRECISION,
    "order_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "market_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_season_rules" (
    "id" SERIAL NOT NULL,
    "zone_id" INTEGER NOT NULL,
    "species" TEXT NOT NULL,
    "season_start" TEXT NOT NULL,
    "season_end" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "max_kg" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "zone_season_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_events" (
    "id" SERIAL NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload_json" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fisher_compliance" (
    "fisher_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 100,
    "violations_count" INTEGER NOT NULL DEFAULT 0,
    "open_violations" INTEGER NOT NULL DEFAULT 0,
    "last_violation_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fisher_compliance_pkey" PRIMARY KEY ("fisher_id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" SERIAL NOT NULL,
    "reference_id" TEXT NOT NULL,
    "inspector_id" INTEGER NOT NULL,
    "fisher_id" INTEGER,
    "zone_id" INTEGER,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "outcome" TEXT,
    "notes" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violations" (
    "id" SERIAL NOT NULL,
    "reference_id" TEXT NOT NULL,
    "fisher_id" INTEGER NOT NULL,
    "boat_id" INTEGER,
    "zone_id" INTEGER,
    "catch_id" INTEGER,
    "inspection_id" INTEGER,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "fine_amount" DOUBLE PRECISION,
    "fine_status" TEXT,
    "reported_by_user_id" INTEGER NOT NULL,
    "reviewed_by" INTEGER,
    "evidence_urls" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "violations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fishers_user_id_key" ON "fishers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fishers_license_number_key" ON "fishers"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "buyers_user_id_key" ON "buyers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "boats_registration_number_key" ON "boats"("registration_number");

-- CreateIndex
CREATE INDEX "boat_trips_boat_id_status_idx" ON "boat_trips"("boat_id", "status");

-- CreateIndex
CREATE INDEX "boat_trips_fisher_id_status_idx" ON "boat_trips"("fisher_id", "status");

-- CreateIndex
CREATE INDEX "boat_positions_boat_id_recorded_at_idx" ON "boat_positions"("boat_id", "recorded_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "catch_submissions_reference_id_key" ON "catch_submissions"("reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_reference_id_key" ON "orders"("reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "species_quotas_species_month_year_key" ON "species_quotas"("species", "month", "year");

-- CreateIndex
CREATE INDEX "price_history_species_recorded_at_idx" ON "price_history"("species", "recorded_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "market_snapshots_snapshot_date_species_key" ON "market_snapshots"("snapshot_date", "species");

-- CreateIndex
CREATE UNIQUE INDEX "inspections_reference_id_key" ON "inspections"("reference_id");

-- CreateIndex
CREATE INDEX "inspections_inspector_id_status_idx" ON "inspections"("inspector_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "violations_reference_id_key" ON "violations"("reference_id");

-- CreateIndex
CREATE INDEX "violations_fisher_id_idx" ON "violations"("fisher_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fishers" ADD CONSTRAINT "fishers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fishers" ADD CONSTRAINT "fishers_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "fishing_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boats" ADD CONSTRAINT "boats_fisher_id_fkey" FOREIGN KEY ("fisher_id") REFERENCES "fishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boat_trips" ADD CONSTRAINT "boat_trips_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "boats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boat_trips" ADD CONSTRAINT "boat_trips_fisher_id_fkey" FOREIGN KEY ("fisher_id") REFERENCES "fishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boat_positions" ADD CONSTRAINT "boat_positions_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "boats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boat_positions" ADD CONSTRAINT "boat_positions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "boat_trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_submissions" ADD CONSTRAINT "catch_submissions_fisher_id_fkey" FOREIGN KEY ("fisher_id") REFERENCES "fishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_submissions" ADD CONSTRAINT "catch_submissions_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "fishing_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_submissions" ADD CONSTRAINT "catch_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "catch_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_fisher_id_fkey" FOREIGN KEY ("fisher_id") REFERENCES "fishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_season_rules" ADD CONSTRAINT "zone_season_rules_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "fishing_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fisher_compliance" ADD CONSTRAINT "fisher_compliance_fisher_id_fkey" FOREIGN KEY ("fisher_id") REFERENCES "fishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_fisher_id_fkey" FOREIGN KEY ("fisher_id") REFERENCES "fishers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "fishing_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_fisher_id_fkey" FOREIGN KEY ("fisher_id") REFERENCES "fishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "boats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "fishing_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "catch_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
