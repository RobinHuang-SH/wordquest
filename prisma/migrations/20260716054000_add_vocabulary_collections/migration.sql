CREATE TABLE "vocabulary_collections" (
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_license" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "vocabulary_collections_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "vocabulary_collection_words" (
    "collection_key" VARCHAR(50) NOT NULL,
    "vocabulary_id" UUID NOT NULL,
    "rank" INTEGER,
    "grade_band" VARCHAR(30),
    "metadata_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vocabulary_collection_words_pkey" PRIMARY KEY ("collection_key", "vocabulary_id")
);

CREATE INDEX "vocabulary_collection_words_vocabulary_id_idx" ON "vocabulary_collection_words"("vocabulary_id");
CREATE INDEX "vocabulary_collection_words_collection_key_grade_band_rank_idx" ON "vocabulary_collection_words"("collection_key", "grade_band", "rank");

ALTER TABLE "vocabulary_collection_words" ADD CONSTRAINT "vocabulary_collection_words_collection_key_fkey" FOREIGN KEY ("collection_key") REFERENCES "vocabulary_collections"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vocabulary_collection_words" ADD CONSTRAINT "vocabulary_collection_words_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
