import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminssionStep1773836512316 implements MigrationInterface {
  name = 'CreateAdminssionStep1773836512316';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          CREATE TABLE "admission_steps" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "application_id" uuid NOT NULL,
            "step_code" character varying(100) NOT NULL,
            "step_name" character varying(255) NOT NULL,
            "sequence_no" integer NOT NULL,
            "status" character varying(50) NOT NULL DEFAULT 'INCOMPLETE',
            "assigned_role" character varying(50),
            "assigned_user_id" uuid,
            "submitted_by" uuid,
            "reviewed_by" uuid,
            "approved_by" uuid,
            "rejected_by" uuid,
            "returned_by" uuid,
            "started_at" TIMESTAMP,
            "submitted_at" TIMESTAMP,
            "approved_at" TIMESTAMP,
            "rejected_at" TIMESTAMP,
            "returned_at" TIMESTAMP,
            "due_date" TIMESTAMP,
            "note" text,
            "rejection_reason" text,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_admission_steps_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_admission_steps_application_step" UNIQUE ("application_id", "step_code"),
            CONSTRAINT "FK_admission_steps_application"
              FOREIGN KEY ("application_id")
              REFERENCES "admission_applications"("id")
              ON DELETE CASCADE
              ON UPDATE NO ACTION
          )
        `);

    await queryRunner.query(`
          CREATE INDEX "IDX_admission_steps_application"
          ON "admission_steps" ("application_id")
        `);

    await queryRunner.query(`
          CREATE INDEX "IDX_admission_steps_step_code"
          ON "admission_steps" ("step_code")
        `);

    await queryRunner.query(`
          CREATE INDEX "IDX_admission_steps_status"
          ON "admission_steps" ("status")
        `);

    await queryRunner.query(`
          CREATE INDEX "IDX_admission_steps_assigned_user"
          ON "admission_steps" ("assigned_user_id")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_admission_steps_assigned_user"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_admission_steps_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_admission_steps_step_code"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_admission_steps_application"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "admission_steps"`);
  }
}
