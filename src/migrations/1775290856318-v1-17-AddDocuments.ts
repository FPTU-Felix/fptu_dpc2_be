import { MigrationInterface, QueryRunner } from 'typeorm';

export class V117AddDocuments1775290856318 implements MigrationInterface {
  name = 'V117AddDocuments1775290856318';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "document_categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_672faab02d41a41ffd92ecd69e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(500) NOT NULL, "description" text, "file_name" character varying(255) NOT NULL, "file_url" character varying(1000) NOT NULL, "uploaded_by" character varying(255) NOT NULL DEFAULT 'Chi ủy', "is_featured" boolean NOT NULL DEFAULT false, "category_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" DROP COLUMN "criteria_checklist"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" DROP COLUMN "score"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" ALTER COLUMN "assessment_file_url" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_b89e90c19762165e9647686650e" FOREIGN KEY ("category_id") REFERENCES "document_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_b89e90c19762165e9647686650e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" ALTER COLUMN "assessment_file_url" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" ADD "score" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" ADD "criteria_checklist" jsonb`,
    );
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "document_categories"`);
  }
}
