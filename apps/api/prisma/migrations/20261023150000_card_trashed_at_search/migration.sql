-- AlterTable
ALTER TABLE "card" ADD COLUMN     "trashed_at" TIMESTAMP(3);


-- READ-03: accent-insensitive search ("dong vat" finds "động vật").
CREATE EXTENSION IF NOT EXISTS unaccent;
