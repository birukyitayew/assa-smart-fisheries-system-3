-- CreateTable
CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "center_lat" DOUBLE PRECISION,
    "center_lng" DOUBLE PRECISION,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_code_key" ON "regions"("code");

-- Default region for existing zones
INSERT INTO "regions" ("name", "code", "description", "center_lat", "center_lng")
VALUES ('Lake Tana', 'TANA', 'Lake Tana — Amhara Region', 11.75, 37.35);

-- AlterTable (nullable first for backfill)
ALTER TABLE "fishing_zones" ADD COLUMN "region_id" INTEGER;
ALTER TABLE "users" ADD COLUMN "region_id" INTEGER;

UPDATE "fishing_zones" SET "region_id" = 1 WHERE "region_id" IS NULL;

ALTER TABLE "fishing_zones" ALTER COLUMN "region_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fishing_zones" ADD CONSTRAINT "fishing_zones_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
