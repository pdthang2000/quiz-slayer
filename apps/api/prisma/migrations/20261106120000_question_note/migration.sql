-- CreateTable
CREATE TABLE "question_note" (
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_note_pkey" PRIMARY KEY ("user_id","question_id")
);

-- CreateIndex
CREATE INDEX "question_note_question_id_idx" ON "question_note"("question_id");

