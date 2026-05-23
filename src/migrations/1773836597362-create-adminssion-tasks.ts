import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAdminssionTasks1773836597362 implements MigrationInterface {
    name = 'CreateAdminssionTasks1773836597362'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          CREATE TABLE "admission_tasks" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "application_id" uuid NOT NULL,
            "step_id" uuid NOT NULL,
            "task_type" character varying(100) NOT NULL,
            "assigned_role" character varying(50),
            "assigned_user_id" uuid,
            "status" character varying(50) NOT NULL DEFAULT 'PENDING',
            "title" character varying(255) NOT NULL,
            "description" text,
            "action_url" text,
            "due_date" TIMESTAMP,
            "completed_at" TIMESTAMP,
            "completed_by" uuid,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_admission_tasks_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_admission_tasks_application"
              FOREIGN KEY ("application_id")
              REFERENCES "admission_applications"("id")
              ON DELETE CASCADE
              ON UPDATE NO ACTION,
            CONSTRAINT "FK_admission_tasks_step"
              FOREIGN KEY ("step_id")
              REFERENCES "admission_steps"("id")
              ON DELETE CASCADE
              ON UPDATE NO ACTION
          )
        `);
    
        await queryRunner.query(`
          CREATE INDEX "IDX_admission_tasks_application"
          ON "admission_tasks" ("application_id")
        `);
    
        await queryRunner.query(`
          CREATE INDEX "IDX_admission_tasks_step"
          ON "admission_tasks" ("step_id")
        `);
    
        await queryRunner.query(`
          CREATE INDEX "IDX_admission_tasks_assigned_user"
          ON "admission_tasks" ("assigned_user_id")
        `);
    
        await queryRunner.query(`
          CREATE INDEX "IDX_admission_tasks_status"
          ON "admission_tasks" ("status")
        `);
      }
    
      public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admission_tasks_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admission_tasks_assigned_user"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admission_tasks_step"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admission_tasks_application"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "admission_tasks"`);
      }

}
