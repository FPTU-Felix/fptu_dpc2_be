import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatbotModel1773113387231 implements MigrationInterface {
  name = 'AddChatbotModel1773113387231';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // Enums
    await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_version_status_enum') THEN
                CREATE TYPE document_version_status_enum AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_sender_enum') THEN
                CREATE TYPE chat_sender_enum AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tool_call_status_enum') THEN
                CREATE TYPE tool_call_status_enum AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');
            END IF;
        END
        $$;
    `);

    // ==========================================================
    // document_versions
    // ==========================================================
    await queryRunner.query(`
        CREATE TABLE "document_versions" (
            "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            "document_id" TEXT NOT NULL,
            "version_label" VARCHAR(50) NOT NULL,
            "file_name" VARCHAR(255) NOT NULL,
            "file_url" TEXT,
            "file_key" TEXT,
            "file_type" VARCHAR(50),
            "file_size" BIGINT,
            "checksum" VARCHAR(128),
            "extracted_text" TEXT,
            "effective_from" TIMESTAMP,
            "effective_to" TIMESTAMP,
            "is_active" BOOLEAN DEFAULT TRUE,
            "ingestion_status" document_version_status_enum DEFAULT 'PENDING',
            "error_message" TEXT,
            "uploaded_by" TEXT,
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "FK_document_versions_document"
                FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_document_versions_user"
                FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL
        )
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_document_versions_document"
        ON "document_versions" ("document_id")
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_document_versions_active"
        ON "document_versions" ("document_id","is_active")
    `);

    // ==========================================================
    // document_chunks
    // ==========================================================
    await queryRunner.query(`
        CREATE TABLE "document_chunks" (
            "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            "document_version_id" TEXT NOT NULL,
            "chunk_index" INT NOT NULL,
            "content" TEXT NOT NULL,
            "page_number" INT,
            "section_path" VARCHAR(1000),
            "token_count" INT,
            "metadata" JSONB,
            "embedding" vector(1536),
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "UQ_document_chunks"
                UNIQUE ("document_version_id","chunk_index"),
            CONSTRAINT "FK_document_chunks_version"
                FOREIGN KEY ("document_version_id")
                REFERENCES "document_versions"("id")
                ON DELETE CASCADE
        )
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_document_chunks_version"
        ON "document_chunks" ("document_version_id")
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_document_chunks_embedding"
        ON "document_chunks"
        USING ivfflat ("embedding" vector_cosine_ops)
        WITH (lists = 100)
    `);

    // ==========================================================
    // chat_sessions
    // ==========================================================
    await queryRunner.query(`
        CREATE TABLE "chat_sessions" (
            "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            "user_id" TEXT NOT NULL,
            "title" VARCHAR(255),
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "FK_chat_sessions_user"
                FOREIGN KEY ("user_id")
                REFERENCES "users"("id")
                ON DELETE CASCADE
        )
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_chat_sessions_user"
        ON "chat_sessions" ("user_id")
    `);

    // ==========================================================
    // chat_messages
    // ==========================================================
    await queryRunner.query(`
        CREATE TABLE "chat_messages" (
            "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            "session_id" TEXT NOT NULL,
            "sender_type" chat_sender_enum NOT NULL,
            "message_text" TEXT NOT NULL,
            "message_type" VARCHAR(30) DEFAULT 'TEXT',
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "FK_chat_messages_session"
                FOREIGN KEY ("session_id")
                REFERENCES "chat_sessions"("id")
                ON DELETE CASCADE
        )
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_chat_messages_session"
        ON "chat_messages" ("session_id")
    `);

    // ==========================================================
    // chat_retrieval_logs
    // ==========================================================
    await queryRunner.query(`
        CREATE TABLE "chat_retrieval_logs" (
            "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            "chat_message_id" TEXT NOT NULL,
            "document_chunk_id" TEXT NOT NULL,
            "rank_order" INT NOT NULL,
            "similarity_score" DECIMAL(10,6),
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "FK_chat_retrieval_logs_message"
                FOREIGN KEY ("chat_message_id")
                REFERENCES "chat_messages"("id")
                ON DELETE CASCADE,
            CONSTRAINT "FK_chat_retrieval_logs_chunk"
                FOREIGN KEY ("document_chunk_id")
                REFERENCES "document_chunks"("id")
                ON DELETE CASCADE
        )
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_chat_retrieval_logs_message"
        ON "chat_retrieval_logs" ("chat_message_id")
    `);

    // ==========================================================
    // chat_tool_calls
    // ==========================================================
    await queryRunner.query(`
        CREATE TABLE "chat_tool_calls" (
            "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            "chat_message_id" TEXT NOT NULL,
            "tool_name" VARCHAR(100) NOT NULL,
            "tool_input" JSONB,
            "tool_output" JSONB,
            "status" tool_call_status_enum DEFAULT 'SUCCESS',
            "error_message" TEXT,   
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "FK_chat_tool_calls_message"
                FOREIGN KEY ("chat_message_id")
                REFERENCES "chat_messages"("id")
                ON DELETE CASCADE
        )
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_chat_tool_calls_message"
        ON "chat_tool_calls" ("chat_message_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_tool_calls"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_retrieval_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_chunks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_versions"`);

    await queryRunner.query(`DROP TYPE IF EXISTS tool_call_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS chat_sender_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS document_version_status_enum`);
  }
}
