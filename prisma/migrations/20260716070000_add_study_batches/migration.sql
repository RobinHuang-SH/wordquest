ALTER TABLE "daily_sessions"
ADD COLUMN "batch_number" INTEGER NOT NULL DEFAULT 1;

DROP INDEX "daily_sessions_user_id_session_date_key";

CREATE UNIQUE INDEX "daily_sessions_user_id_session_date_batch_number_key"
ON "daily_sessions"("user_id", "session_date", "batch_number");
