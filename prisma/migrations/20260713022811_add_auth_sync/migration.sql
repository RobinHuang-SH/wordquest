-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_hash" TEXT;

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "device_id" VARCHAR(100) NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_used_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sync_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "state_json" JSONB NOT NULL DEFAULT '{}',
    "source_device_id" VARCHAR(100) NOT NULL,
    "client_updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" VARCHAR(100) NOT NULL,
    "base_revision" INTEGER NOT NULL,
    "server_revision" INTEGER NOT NULL,
    "incoming_state_json" JSONB NOT NULL,
    "resolved_state_json" JSONB NOT NULL,
    "resolution_strategy" VARCHAR(50) NOT NULL DEFAULT 'deterministic_merge',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_expires_at_idx" ON "auth_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "auth_sessions_device_id_idx" ON "auth_sessions"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sync_states_user_id_key" ON "user_sync_states"("user_id");

-- CreateIndex
CREATE INDEX "sync_conflicts_user_id_created_at_idx" ON "sync_conflicts"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sync_states" ADD CONSTRAINT "user_sync_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
