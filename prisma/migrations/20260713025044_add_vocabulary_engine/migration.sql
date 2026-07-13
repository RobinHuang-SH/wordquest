-- AlterTable
ALTER TABLE "user_word_state" ADD COLUMN     "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
ADD COLUMN     "lapse_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "review_interval_days" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "vocabulary" ADD COLUMN     "collection" VARCHAR(50) NOT NULL DEFAULT 'daily-frequency',
ADD COLUMN     "source_license" VARCHAR(100) NOT NULL DEFAULT 'internal-curated',
ADD COLUMN     "source_name" VARCHAR(100) NOT NULL DEFAULT 'wordquest-curated';
