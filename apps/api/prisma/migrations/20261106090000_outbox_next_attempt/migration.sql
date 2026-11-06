-- AlterTable
ALTER TABLE "outbox_event" ADD COLUMN     "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "outbox_event_delivered_at_next_attempt_at_idx" ON "outbox_event"("delivered_at", "next_attempt_at");

