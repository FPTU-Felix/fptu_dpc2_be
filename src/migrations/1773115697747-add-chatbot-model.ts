import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatbotModel1773115697747 implements MigrationInterface {
  name = 'AddChatbotModel1773115697747';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await queryRunner.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_sender_enum') THEN
              CREATE TYPE chat_sender_enum AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tool_call_status_enum') THEN
              CREATE TYPE tool_call_status_enum AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');
          END IF;
      END
      $$;
    `);

    /**
     * ✅ document_ai_knowledge (FIX FULL)
     */
    await queryRunner.query(`
      CREATE TABLE "document_ai_knowledge" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "title" VARCHAR(255) NOT NULL,
          "description" TEXT,

          "party_cell_id" uuid,
          "created_by" uuid,

          "file_url" TEXT,
          "object_name" VARCHAR(1000),
          "bucket" VARCHAR(255),
          "file_name" VARCHAR(255),
          "mime_type" VARCHAR(255),
          "file_size" BIGINT,

          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "PK_document_ai_knowledge_id" PRIMARY KEY ("id"),

          CONSTRAINT "FK_document_ai_knowledge_user"
              FOREIGN KEY ("created_by")
              REFERENCES "users"("id")
              ON DELETE SET NULL,

          CONSTRAINT "FK_document_ai_knowledge_party_cell"
              FOREIGN KEY ("party_cell_id")
              REFERENCES "party_cells"("id")
              ON DELETE SET NULL
      )
    `);

    /**
     * document_chunks
     */
    await queryRunner.query(`
      CREATE TABLE "document_chunks" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "document_id" uuid NOT NULL,
          "chunk_index" INT NOT NULL,
          "content" TEXT NOT NULL,
          "page_number" INT,
          "section_path" VARCHAR(1000),
          "token_count" INT,
          "metadata" JSONB,
          "embedding" vector(768),
          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "PK_document_chunks_id" PRIMARY KEY ("id"),

          CONSTRAINT "UQ_document_chunks"
              UNIQUE ("document_id", "chunk_index"),

          CONSTRAINT "FK_document_chunks_document"
              FOREIGN KEY ("document_id")
              REFERENCES "document_ai_knowledge"("id")
              ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_document_chunks_document"
      ON "document_chunks" ("document_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_document_chunks_embedding"
      ON "document_chunks"
      USING ivfflat ("embedding" vector_cosine_ops)
      WITH (lists = 100)
    `);

    /**
     * chat_sessions
     */
    await queryRunner.query(`
      CREATE TABLE "chat_sessions" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "user_id" uuid NOT NULL,
          "title" VARCHAR(255),
          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "PK_chat_sessions_id" PRIMARY KEY ("id"),

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

    /**
     * chat_messages
     */
    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "session_id" uuid NOT NULL,
          "sender_type" chat_sender_enum NOT NULL,
          "message_text" TEXT NOT NULL,
          "message_type" VARCHAR(30) NOT NULL DEFAULT 'TEXT',
          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "PK_chat_messages_id" PRIMARY KEY ("id"),

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

    /**
     * chat_retrieval_logs
     */
    await queryRunner.query(`
      CREATE TABLE "chat_retrieval_logs" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "chat_message_id" uuid NOT NULL,
          "document_chunk_id" uuid NOT NULL,
          "rank_order" INT NOT NULL,
          "similarity_score" DECIMAL(10,6),
          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "PK_chat_retrieval_logs_id" PRIMARY KEY ("id"),

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

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_retrieval_logs_chunk"
      ON "chat_retrieval_logs" ("document_chunk_id")
    `);

    /**
     * chat_tool_calls
     */
    await queryRunner.query(`
      CREATE TABLE "chat_tool_calls" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "chat_message_id" uuid NOT NULL,
          "tool_name" VARCHAR(100) NOT NULL,
          "tool_input" JSONB,
          "tool_output" JSONB,
          "status" tool_call_status_enum NOT NULL DEFAULT 'SUCCESS',
          "error_message" TEXT,
          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "PK_chat_tool_calls_id" PRIMARY KEY ("id"),

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
    await queryRunner.query(`DROP TABLE IF EXISTS "document_ai_knowledge"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "tool_call_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "chat_sender_enum"`);
  }
}