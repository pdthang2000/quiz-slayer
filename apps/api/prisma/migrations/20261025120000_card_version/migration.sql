-- CARD-08: optimistic locking (C-39).
ALTER TABLE "card" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
