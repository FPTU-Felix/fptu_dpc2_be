import { MigrationInterface, QueryRunner } from 'typeorm';

export class V117AnualAssetment1775240656289 implements MigrationInterface {
  name = 'V117AnualAssetment1775240656289';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "evaluation_configs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "party_cell_id" uuid NOT NULL, "year" integer NOT NULL, "criteria_template" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e04dfad55b3f4b0b53b41f30de4" UNIQUE ("party_cell_id", "year"), CONSTRAINT "PK_553e92bee73690f7843eb95aece" PRIMARY KEY ("id"))`,
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
      `ALTER TABLE "evaluation_configs" ADD CONSTRAINT "FK_451b4064846c086f9eba78d0f0f" FOREIGN KEY ("party_cell_id") REFERENCES "party_cells"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "evaluation_configs" DROP CONSTRAINT "FK_451b4064846c086f9eba78d0f0f"`,
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
    await queryRunner.query(`DROP TABLE "evaluation_configs"`);
  }
}
