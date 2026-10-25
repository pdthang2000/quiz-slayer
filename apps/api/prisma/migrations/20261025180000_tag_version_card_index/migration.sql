-- TAG-16: optimistic locking for tags (C-44).
ALTER TABLE "tag" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- READ-02, CARDTAG-08: Active cards newest first.
CREATE INDEX "card_user_id_state_created_at_idx" ON "card"("user_id", "state", "created_at");
