-- AlterTable
ALTER TABLE "fishers" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "alerts_is_read_created_at_idx" ON "alerts"("is_read", "created_at");

-- CreateIndex
CREATE INDEX "catch_submissions_status_submitted_at_idx" ON "catch_submissions"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_listed_at_idx" ON "marketplace_listings"("status", "listed_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "orders_buyer_id_ordered_at_idx" ON "orders"("buyer_id", "ordered_at");
