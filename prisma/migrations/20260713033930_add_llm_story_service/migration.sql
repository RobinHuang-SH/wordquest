-- CreateEnum
CREATE TYPE "StoryGenerationStatus" AS ENUM ('SUCCESS', 'FALLBACK');

-- CreateTable
CREATE TABLE "story_prompt_versions" (
    "id" UUID NOT NULL,
    "prompt_key" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "user_prompt_template" TEXT NOT NULL,
    "schema_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_generations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "story_node_id" UUID,
    "prompt_version_id" UUID NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "status" "StoryGenerationStatus" NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "fallback_reason" VARCHAR(100),
    "error_message" TEXT,
    "request_json" JSONB NOT NULL,
    "response_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_prompt_versions_prompt_key_is_active_idx" ON "story_prompt_versions"("prompt_key", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "story_prompt_versions_prompt_key_version_key" ON "story_prompt_versions"("prompt_key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "story_generations_session_id_key" ON "story_generations"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_generations_story_node_id_key" ON "story_generations"("story_node_id");

-- CreateIndex
CREATE INDEX "story_generations_user_id_created_at_idx" ON "story_generations"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "story_generations_status_created_at_idx" ON "story_generations"("status", "created_at");

-- AddForeignKey
ALTER TABLE "story_generations" ADD CONSTRAINT "story_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_generations" ADD CONSTRAINT "story_generations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "daily_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_generations" ADD CONSTRAINT "story_generations_story_node_id_fkey" FOREIGN KEY ("story_node_id") REFERENCES "story_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_generations" ADD CONSTRAINT "story_generations_prompt_version_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "story_prompt_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
