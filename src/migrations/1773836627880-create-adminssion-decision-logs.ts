import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAdminssionDecisionLogs1773836627880 implements MigrationInterface {
    name = 'CreateAdminssionDecisionLogs1773836627880'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          CREATE TABLE "admission_decision_logs" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "application_id" uuid NOT NULL,
            "step_id" uuid,
            "action" character varying(50) NOT NULL,
            "actor_id" uuid NOT NULL,
            "actor_role" character varying(50) NOT NULL,
            "comment" text,
            "metadata" jsonb,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_admission_decision_logs_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_admission_decision_logs_application"
              FOREIGN KEY ("application_id")
              REFERENCES "admission_applications"("id")
              ON DELETE CASCADE
              ON UPDATE NO ACTION,
            CONSTRAINT "FK_admission_decision_logs_step"
              FOREIGN KEY ("step_id")
              REFERENCES "admission_steps"("id")
              ON DELETE SET NULL
              ON UPDATE NO ACTION
          )
        `);
    
        await queryRunner.query(`
          CREATE INDEX "IDX_admission_decision_logs_application"
          ON "admission_decision_logs" ("application_id")
        `);
    
        await queryRunner.query(`
          CREATE INDEX "IDX_admission_decision_logs_step"
          ON "admission_decision_logs" ("step_id")
        `);
    
        await queryRunner.query(`
          CREATE INDEX "IDX_admission_decision_logs_actor"
          ON "admission_decision_logs" ("actor_id")
        `);
    
        await queryRunner.query(`
          CREATE INDEX "IDX_admission_decision_logs_action"
          ON "admission_decision_logs" ("action")
        `);
      }
    
      public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admission_decision_logs_action"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admission_decision_logs_actor"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admission_decision_logs_step"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admission_decision_logs_application"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "admission_decision_logs"`);
      }
}
