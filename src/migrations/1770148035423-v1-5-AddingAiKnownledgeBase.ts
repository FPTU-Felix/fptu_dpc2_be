import { MigrationInterface, QueryRunner } from 'typeorm';

export class V15AddingAiKnownledgeBase1770148035423 implements MigrationInterface {
  name = 'V15AddingAiKnownledgeBase1770148035423';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."ai_knowledge_base_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ai_knowledge_base" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" text NOT NULL, "content" text, "file_url" character varying, "status" "public"."ai_knowledge_base_status_enum" NOT NULL DEFAULT 'PENDING', "party_cell_id" uuid NOT NULL, "user_id" uuid NOT NULL, "rejection_reason" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_823e566458c83ff5165a1fae0fc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_knowledge_base" ADD CONSTRAINT "FK_fa554fa15e67675623cdecf80a1" FOREIGN KEY ("party_cell_id") REFERENCES "party_cells"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_knowledge_base" ADD CONSTRAINT "FK_5d0b4754d35c7539f36aaa86bfd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_knowledge_base" DROP CONSTRAINT "FK_5d0b4754d35c7539f36aaa86bfd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_knowledge_base" DROP CONSTRAINT "FK_fa554fa15e67675623cdecf80a1"`,
    );
    await queryRunner.query(`DROP TABLE "ai_knowledge_base"`);
    await queryRunner.query(
      `DROP TYPE "public"."ai_knowledge_base_status_enum"`,
    );
  }
}
