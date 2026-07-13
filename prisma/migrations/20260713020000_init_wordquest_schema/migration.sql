-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EnglishLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "PreferredAccent" AS ENUM ('US', 'UK');

-- CreateEnum
CREATE TYPE "UserWordStatus" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'MASTERED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('GENERATED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SessionWordType" AS ENUM ('NEW', 'REVIEW');

-- CreateEnum
CREATE TYPE "LearningResult" AS ENUM ('KNOW', 'FUZZY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "QuizResult" AS ENUM ('CORRECT', 'INCORRECT', 'SKIPPED');

-- CreateEnum
CREATE TYPE "StorySeriesStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ObsidianSyncStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING', 'SYNCED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "native_language" VARCHAR(20) NOT NULL DEFAULT 'zh-CN',
    "english_level" "EnglishLevel" NOT NULL DEFAULT 'A2',
    "target_level" "EnglishLevel" NOT NULL DEFAULT 'B1',
    "preferred_accent" "PreferredAccent" NOT NULL DEFAULT 'US',
    "daily_word_count" INTEGER NOT NULL DEFAULT 20,
    "new_word_ratio" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "story_genre" VARCHAR(50) NOT NULL DEFAULT 'adventure',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary" (
    "id" UUID NOT NULL,
    "word" VARCHAR(100) NOT NULL,
    "lemma" VARCHAR(100) NOT NULL,
    "part_of_speech" VARCHAR(30) NOT NULL,
    "level" "EnglishLevel" NOT NULL,
    "meaning_zh" TEXT NOT NULL,
    "definition_en" TEXT NOT NULL,
    "phonetic_us" VARCHAR(100),
    "phonetic_uk" VARCHAR(100),
    "frequency_rank" INTEGER,
    "example_sentence" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_word_state" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "word_id" UUID NOT NULL,
    "status" "UserWordStatus" NOT NULL DEFAULT 'NEW',
    "memory_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pronunciation_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spelling_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "listening_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "times_seen" INTEGER NOT NULL DEFAULT 0,
    "times_correct" INTEGER NOT NULL DEFAULT 0,
    "last_reviewed_at" TIMESTAMPTZ(3),
    "next_review_at" TIMESTAMPTZ(3),
    "is_difficult" BOOLEAN NOT NULL DEFAULT false,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_word_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_date" DATE NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'GENERATED',
    "new_word_count" INTEGER NOT NULL DEFAULT 15,
    "review_word_count" INTEGER NOT NULL DEFAULT 5,
    "quiz_score" DOUBLE PRECISION,
    "pronunciation_score" DOUBLE PRECISION,
    "story_id" UUID,
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_session_words" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "word_id" UUID NOT NULL,
    "word_type" "SessionWordType" NOT NULL,
    "learning_result" "LearningResult",
    "quiz_result" "QuizResult",
    "pronunciation_score" DOUBLE PRECISION,
    "sequence" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_session_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_series" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "genre" VARCHAR(50) NOT NULL,
    "level" "EnglishLevel" NOT NULL,
    "story_bible_json" JSONB NOT NULL DEFAULT '{}',
    "current_week" INTEGER NOT NULL DEFAULT 1,
    "current_chapter" INTEGER NOT NULL DEFAULT 1,
    "status" "StorySeriesStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "story_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_nodes" (
    "id" UUID NOT NULL,
    "story_series_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "parent_node_id" UUID,
    "title" VARCHAR(200),
    "content" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "vocabulary_coverage" JSONB NOT NULL DEFAULT '{}',
    "selected_choice_id" UUID,
    "state_before_json" JSONB NOT NULL DEFAULT '{}',
    "state_after_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "story_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_choices" (
    "id" UUID NOT NULL,
    "story_node_id" UUID NOT NULL,
    "choice_text" TEXT NOT NULL,
    "choice_summary" TEXT NOT NULL,
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pronunciation_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "word_id" UUID NOT NULL,
    "audio_url" TEXT,
    "accuracy_score" DOUBLE PRECISION NOT NULL,
    "fluency_score" DOUBLE PRECISION NOT NULL,
    "completeness_score" DOUBLE PRECISION NOT NULL,
    "prosody_score" DOUBLE PRECISION,
    "feedback_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pronunciation_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "week_end" DATE NOT NULL,
    "statistics_json" JSONB NOT NULL DEFAULT '{}',
    "weekly_story" TEXT NOT NULL,
    "review_suggestions" TEXT NOT NULL,
    "obsidian_sync_status" "ObsidianSyncStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "weekly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_word_key" ON "vocabulary"("word");

-- CreateIndex
CREATE INDEX "vocabulary_lemma_idx" ON "vocabulary"("lemma");

-- CreateIndex
CREATE INDEX "vocabulary_level_frequency_rank_idx" ON "vocabulary"("level", "frequency_rank");

-- CreateIndex
CREATE INDEX "user_word_state_user_id_status_next_review_at_idx" ON "user_word_state"("user_id", "status", "next_review_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_word_state_user_id_word_id_key" ON "user_word_state"("user_id", "word_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_sessions_story_id_key" ON "daily_sessions"("story_id");

-- CreateIndex
CREATE INDEX "daily_sessions_user_id_status_session_date_idx" ON "daily_sessions"("user_id", "status", "session_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_sessions_user_id_session_date_key" ON "daily_sessions"("user_id", "session_date");

-- CreateIndex
CREATE INDEX "daily_session_words_word_id_idx" ON "daily_session_words"("word_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_session_words_session_id_word_id_key" ON "daily_session_words"("session_id", "word_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_session_words_session_id_sequence_key" ON "daily_session_words"("session_id", "sequence");

-- CreateIndex
CREATE INDEX "story_series_user_id_status_idx" ON "story_series"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "story_series_user_id_title_key" ON "story_series"("user_id", "title");

-- CreateIndex
CREATE UNIQUE INDEX "story_nodes_selected_choice_id_key" ON "story_nodes"("selected_choice_id");

-- CreateIndex
CREATE INDEX "story_nodes_story_series_id_created_at_idx" ON "story_nodes"("story_series_id", "created_at");

-- CreateIndex
CREATE INDEX "story_nodes_session_id_idx" ON "story_nodes"("session_id");

-- CreateIndex
CREATE INDEX "story_nodes_parent_node_id_idx" ON "story_nodes"("parent_node_id");

-- CreateIndex
CREATE INDEX "story_choices_story_node_id_is_selected_idx" ON "story_choices"("story_node_id", "is_selected");

-- CreateIndex
CREATE UNIQUE INDEX "story_choices_story_node_id_sequence_key" ON "story_choices"("story_node_id", "sequence");

-- CreateIndex
CREATE INDEX "pronunciation_attempts_user_id_word_id_created_at_idx" ON "pronunciation_attempts"("user_id", "word_id", "created_at");

-- CreateIndex
CREATE INDEX "weekly_reports_user_id_week_end_idx" ON "weekly_reports"("user_id", "week_end");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_reports_user_id_week_start_key" ON "weekly_reports"("user_id", "week_start");

-- AddForeignKey
ALTER TABLE "user_word_state" ADD CONSTRAINT "user_word_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_word_state" ADD CONSTRAINT "user_word_state_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "story_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_session_words" ADD CONSTRAINT "daily_session_words_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "daily_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_session_words" ADD CONSTRAINT "daily_session_words_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "vocabulary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_series" ADD CONSTRAINT "story_series_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_nodes" ADD CONSTRAINT "story_nodes_story_series_id_fkey" FOREIGN KEY ("story_series_id") REFERENCES "story_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_nodes" ADD CONSTRAINT "story_nodes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "daily_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_nodes" ADD CONSTRAINT "story_nodes_parent_node_id_fkey" FOREIGN KEY ("parent_node_id") REFERENCES "story_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_nodes" ADD CONSTRAINT "story_nodes_selected_choice_id_fkey" FOREIGN KEY ("selected_choice_id") REFERENCES "story_choices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_choices" ADD CONSTRAINT "story_choices_story_node_id_fkey" FOREIGN KEY ("story_node_id") REFERENCES "story_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pronunciation_attempts" ADD CONSTRAINT "pronunciation_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pronunciation_attempts" ADD CONSTRAINT "pronunciation_attempts_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
