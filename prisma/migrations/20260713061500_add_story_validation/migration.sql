-- AlterTable
ALTER TABLE "story_generations"
ADD COLUMN "repair_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "validation_json" JSONB NOT NULL DEFAULT '{}';
