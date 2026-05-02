import { MigrationInterface, QueryRunner } from "typeorm";

export class DocumentMigration1777706125145 implements MigrationInterface {
    name = 'DocumentMigration1777706125145'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
        await queryRunner.query(`
      CREATE TABLE "document_ai_knowledge" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" varchar(255) NOT NULL,
        "description" text,
        "party_cell_id" uuid,
        "created_by" uuid,
        "file_url" text,
        "object_name" varchar(1000),
        "bucket" varchar(255),
        "file_name" varchar(255),
        "mime_type" varchar(255),
        "file_size" bigint,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      )
    `);

        await queryRunner.query(`
      CREATE TABLE "document_chunks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "document_id" uuid NOT NULL,
        "chunk_index" int NOT NULL,
        "content" text NOT NULL,
        "page_number" int,
        "section_path" varchar(2000),
        "token_count" int,
        "metadata" jsonb,
        "embedding" vector(768),
        "created_at" TIMESTAMP DEFAULT now(),

        CONSTRAINT "fk_document_chunks_document"
        FOREIGN KEY ("document_id")
        REFERENCES "document_ai_knowledge"("id")
        ON DELETE CASCADE
      )
    `);

        await queryRunner.query(`
      CREATE INDEX "idx_document_chunks_document_id"
      ON "document_chunks" ("document_id")
    `);

        await queryRunner.query(`
      CREATE INDEX "idx_document_chunks_embedding"
      ON "document_chunks"
      USING ivfflat ("embedding" vector_cosine_ops)
      WITH (lists = 100)
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_document_chunks_embedding"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_document_chunks_document_id"`);

        await queryRunner.query(`DROP TABLE IF EXISTS "document_chunks"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "document_ai_knowledge"`);
    }
}