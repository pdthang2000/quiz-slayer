-- CreateEnum
CREATE TYPE "quiz_set_visibility" AS ENUM ('Private', 'Public');

-- CreateEnum
CREATE TYPE "quiz_kind" AS ENUM ('single', 'single_audio', 'reading_group', 'audio_group');

-- CreateEnum
CREATE TYPE "track_state" AS ENUM ('Active', 'Removed');

-- CreateTable
CREATE TABLE "quiz_set" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID,
    "name" TEXT NOT NULL,
    "visibility" "quiz_set_visibility" NOT NULL DEFAULT 'Private',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz" (
    "id" UUID NOT NULL,
    "quiz_set_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "kind" "quiz_kind" NOT NULL,
    "passage" TEXT,
    "audio_url" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "image_url" TEXT,
    "audio_url" TEXT,
    "choices" TEXT[],
    "correct_choice" INTEGER NOT NULL,
    "explanation" TEXT,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_tag" (
    "quiz_id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "quiz_tag_pkey" PRIMARY KEY ("quiz_id","name")
);

-- CreateTable
CREATE TABLE "track" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tag_name" TEXT NOT NULL,
    "kinds" "quiz_kind"[],
    "daily_size" INTEGER NOT NULL,
    "state" "track_state" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_session" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "time_zone" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "tag_name" TEXT NOT NULL,
    "daily_size" INTEGER NOT NULL,
    "quiz_ids" UUID[],
    "quizzes" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "saved_as_card" TEXT[],
    "finished_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_progress" (
    "user_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "last_answered_on" DATE NOT NULL,
    "last_answered_at" TIMESTAMP(3) NOT NULL,
    "last_session_id" UUID NOT NULL,
    "mistake_stage" INTEGER,
    "mistake_due_on" DATE,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quiz_progress_pkey" PRIMARY KEY ("user_id","quiz_id")
);

-- CreateIndex
CREATE INDEX "quiz_set_owner_user_id_idx" ON "quiz_set"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_quiz_set_id_external_id_key" ON "quiz"("quiz_set_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_quiz_id_external_id_key" ON "question"("quiz_id", "external_id");

-- CreateIndex
CREATE INDEX "quiz_tag_name_idx" ON "quiz_tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "track_user_id_tag_name_key" ON "track"("user_id", "tag_name");

-- CreateIndex
CREATE INDEX "daily_session_user_id_day_idx" ON "daily_session"("user_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "daily_session_user_id_track_id_day_key" ON "daily_session"("user_id", "track_id", "day");

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_quiz_set_id_fkey" FOREIGN KEY ("quiz_set_id") REFERENCES "quiz_set"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_tag" ADD CONSTRAINT "quiz_tag_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_session" ADD CONSTRAINT "daily_session_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Backstops only; the rules live in the domain (CLAUDE.md).
-- QB-07 / TAG-01, ADR-003: question tag names are stored NFC normalized.
ALTER TABLE "quiz_tag" ADD CONSTRAINT "quiz_tag_name_nfc" CHECK ("name" IS NFC NORMALIZED);
-- DP-07: 2–6 choices, one correct.
ALTER TABLE "question" ADD CONSTRAINT "question_choices_count" CHECK (cardinality("choices") BETWEEN 2 AND 6);
ALTER TABLE "question" ADD CONSTRAINT "question_correct_choice" CHECK ("correct_choice" >= 0 AND "correct_choice" < cardinality("choices"));
-- DP-12: daily size 1–50.
ALTER TABLE "track" ADD CONSTRAINT "track_daily_size" CHECK ("daily_size" BETWEEN 1 AND 50);
-- DP-33: a mistake waits 1, 3 or 7 days, and has a due day.
ALTER TABLE "quiz_progress" ADD CONSTRAINT "quiz_progress_mistake" CHECK (
  ("mistake_stage" IS NULL AND "mistake_due_on" IS NULL)
  OR ("mistake_stage" IN (1, 3, 7) AND "mistake_due_on" IS NOT NULL)
);
