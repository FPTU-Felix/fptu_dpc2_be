import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1777146196559 implements MigrationInterface {
  name = 'Init1777146196559';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== EXTENSION =====
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "vector";
    `);

    // ===== ai_chat_conversations =====
    await queryRunner.query(`
      CREATE TABLE ai_chat_conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR NOT NULL,

        title VARCHAR(255),
        is_pinned BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,

        last_message_at TIMESTAMP,

        metadata JSONB,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ===== ai_chat_messages =====
    await queryRunner.query(`
      CREATE TABLE ai_chat_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID NOT NULL,

        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,

        parent_message_id UUID,
        is_error BOOLEAN DEFAULT FALSE,

        metadata JSONB,

        created_at TIMESTAMP DEFAULT NOW(),

        CONSTRAINT fk_ai_chat_messages_conversation
          FOREIGN KEY (conversation_id)
          REFERENCES ai_chat_conversations(id)
          ON DELETE CASCADE
      );
    `);

    // ===== ai_chat_message_embeddings =====
    await queryRunner.query(`
      CREATE TABLE ai_chat_message_embeddings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        message_id UUID NOT NULL,

        embedding VECTOR(1536),

        created_at TIMESTAMP DEFAULT NOW(),

        CONSTRAINT fk_ai_chat_message_embeddings_message
          FOREIGN KEY (message_id)
          REFERENCES ai_chat_messages(id)
          ON DELETE CASCADE
      );
    `);

    // ===== ai_chat_audit_logs =====
    await queryRunner.query(`
      CREATE TABLE ai_chat_audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        conversation_id UUID,
        message_id UUID,

        user_id VARCHAR,

        ip_address VARCHAR,
        user_agent TEXT,

        request_id VARCHAR,

        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ===== INDEXES =====
    await queryRunner.query(`
      CREATE INDEX idx_ai_chat_conversations_user
      ON ai_chat_conversations(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_ai_chat_conversations_last_message
      ON ai_chat_conversations(last_message_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_ai_chat_messages_conversation
      ON ai_chat_messages(conversation_id, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_ai_chat_messages_parent
      ON ai_chat_messages(parent_message_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_ai_chat_message_embeddings_message
      ON ai_chat_message_embeddings(message_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_ai_chat_audit_logs_conversation
      ON ai_chat_audit_logs(conversation_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_ai_chat_audit_logs_message
      ON ai_chat_audit_logs(message_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_ai_chat_audit_logs_user
      ON ai_chat_audit_logs(user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_chat_audit_logs_user`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_ai_chat_audit_logs_message`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_ai_chat_audit_logs_conversation`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_ai_chat_message_embeddings_message`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_chat_messages_parent`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_ai_chat_messages_conversation`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_ai_chat_conversations_last_message`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_ai_chat_conversations_user`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS ai_chat_audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_chat_message_embeddings`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_chat_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_chat_conversations`);
  }
}
