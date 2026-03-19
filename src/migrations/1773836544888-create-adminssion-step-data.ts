import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAdminssionStepData1773836544888 implements MigrationInterface {
    name = 'CreateAdminssionStepData1773836544888'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          CREATE TABLE "admission_step_data" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "step_id" uuid NOT NULL,
            "data" jsonb NOT NULL,
            "created_by" uuid NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_admission_step_data_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_admission_step_data_step_id" UNIQUE ("step_id"),
            CONSTRAINT "FK_admission_step_data_step"
              FOREIGN KEY ("step_id")
              REFERENCES "admission_steps"("id")
              ON DELETE CASCADE
              ON UPDATE NO ACTION
          )
        `);
    
        await queryRunner.query(`
          CREATE INDEX "IDX_admission_step_data_step"
          ON "admission_step_data" ("step_id")
        `);
      }
    
      public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admission_step_data_step"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "admission_step_data"`);
      }

}
