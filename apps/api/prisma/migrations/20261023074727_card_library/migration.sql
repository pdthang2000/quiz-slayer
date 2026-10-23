-- CreateEnum
CREATE TYPE "card_state" AS ENUM ('Active', 'Trashed');

-- CreateTable
CREATE TABLE "card" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "state" "card_state" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_tag" (
    "card_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "card_tag_pkey" PRIMARY KEY ("card_id","tag_id")
);

-- CreateIndex
CREATE INDEX "card_user_id_state_idx" ON "card"("user_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "tag_user_id_name_key" ON "tag"("user_id", "name");

-- CreateIndex
CREATE INDEX "card_tag_tag_id_idx" ON "card_tag"("tag_id");

-- AddForeignKey
ALTER TABLE "card_tag" ADD CONSTRAINT "card_tag_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_tag" ADD CONSTRAINT "card_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ADR-003: tag names are stored as NFC (TAG-01).
ALTER TABLE "tag" ADD CONSTRAINT "tag_name_nfc" CHECK ("name" IS NFC NORMALIZED);
