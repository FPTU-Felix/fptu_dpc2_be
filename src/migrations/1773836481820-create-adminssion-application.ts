import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminssionApplication1773836481820 implements MigrationInterface {
  name = 'CreateAdminssionApplication1773836481820';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          CREATE TABLE "admission_applications" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "outstanding_individual_id" uuid NOT NULL,
            "application_code" character varying(50) NOT NULL,
            "current_step" character varying(100) NOT NULL,
            "overall_status" character varying(50) NOT NULL DEFAULT 'IN_PROGRESS',
            "submitted_by" uuid,
            "assigned_committee_id" uuid,
            "assigned_secretary_id" uuid,
            "assigned_deputy_secretary_id" uuid,
            "final_decision" character varying(50),
            "final_decision_note" text,
            "submitted_at" TIMESTAMP,
            "completed_at" TIMESTAMP,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            "deleted_at" TIMESTAMP,
            CONSTRAINT "PK_admission_applications_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_admission_applications_code" UNIQUE ("application_code"),
            CONSTRAINT "FK_admission_applications_outstanding_individual"
              FOREIGN KEY ("outstanding_individual_id")
              REFERENCES "outstanding_individuals"("id")
              ON DELETE NO ACTION
              ON UPDATE NO ACTION
          )
        `);

    await queryRunner.query(`
          CREATE INDEX "IDX_admission_applications_outstanding_individual"
          ON "admission_applications" ("outstanding_individual_id")
        `);

    await queryRunner.query(`
          CREATE INDEX "IDX_admission_applications_current_step"
          ON "admission_applications" ("current_step")
        `);

    await queryRunner.query(`
          CREATE INDEX "IDX_admission_applications_overall_status"
          ON "admission_applications" ("overall_status")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_admission_applications_overall_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_admission_applications_current_step"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_admission_applications_outstanding_individual"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "admission_applications"`);
  }
}
