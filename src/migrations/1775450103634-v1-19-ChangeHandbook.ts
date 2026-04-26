import { MigrationInterface, QueryRunner } from 'typeorm';

export class V119ChangeHandbook1775450103634 implements MigrationInterface {
  name = 'V119ChangeHandbook1775450103634';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."handbook_articles_status_enum" AS ENUM('DRAFT', 'PUBLISHED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "handbook_articles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "short_description" text, "content" text NOT NULL, "thumbnail_url" character varying(500), "author_name" character varying(255), "status" "public"."handbook_articles_status_enum" NOT NULL DEFAULT 'DRAFT', "is_pinned" boolean NOT NULL DEFAULT false, "is_highlighted" boolean NOT NULL DEFAULT false, "view_count" integer NOT NULL DEFAULT '0', "category_id" uuid, "created_by_id" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_25b9f3ce508911e591e8816851f" UNIQUE ("slug"), CONSTRAINT "PK_1d9527bb55a25b61bc27b32be0e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "handbook_categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b28b54ddfa69a0d520524239f46" UNIQUE ("slug"), CONSTRAINT "PK_db6232199e9aa81221b890a2054" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" ADD "criteria_checklist" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" ADD "score" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" ALTER COLUMN "assessment_file_url" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "handbook_articles" ADD CONSTRAINT "FK_0278064ee3098d1eb33f016e442" FOREIGN KEY ("category_id") REFERENCES "handbook_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "handbook_articles" DROP CONSTRAINT "FK_0278064ee3098d1eb33f016e442"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" ALTER COLUMN "assessment_file_url" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" DROP COLUMN "score"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" DROP COLUMN "criteria_checklist"`,
    );
    await queryRunner.query(`DROP TABLE "handbook_categories"`);
    await queryRunner.query(`DROP TABLE "handbook_articles"`);
    await queryRunner.query(
      `DROP TYPE "public"."handbook_articles_status_enum"`,
    );
  }
}
