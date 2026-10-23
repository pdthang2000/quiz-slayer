-- DropForeignKey
ALTER TABLE "card_tag" DROP CONSTRAINT "card_tag_card_id_fkey";

-- DropForeignKey
ALTER TABLE "card_tag" DROP CONSTRAINT "card_tag_tag_id_fkey";

-- AlterTable: add user_id, fill it from the card, then require it (CARD-04, C-22).
ALTER TABLE "card_tag" ADD COLUMN "user_id" UUID;
UPDATE "card_tag" ct SET "user_id" = c."user_id" FROM "card" c WHERE c."id" = ct."card_id";
ALTER TABLE "card_tag" ALTER COLUMN "user_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "card_id_user_id_key" ON "card"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tag_id_user_id_key" ON "tag"("id", "user_id");

-- AddForeignKey
ALTER TABLE "card_tag" ADD CONSTRAINT "card_tag_card_fkey" FOREIGN KEY ("card_id", "user_id") REFERENCES "card"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_tag" ADD CONSTRAINT "card_tag_tag_fkey" FOREIGN KEY ("tag_id", "user_id") REFERENCES "tag"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

