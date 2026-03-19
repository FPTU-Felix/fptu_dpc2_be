import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAdminssionDocument1773836573273 implements MigrationInterface {
    name = 'CreateAdminssionDocument1773836573273'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          CREATE TABLE "admission_documents" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "application_id" uuid NOT NULL,
            "step_id" uuid,
            "document_type" character varying(100) NOT NULL,
            "title" character varying(255) NOT NULL,
            "file_url" text NOT NULL,
            "file_name" character varying(255) NOT NULL,
            "mime_type" character varying(100),
            "file_size" bigint,
            "version_no" integer NOT NULL DEFAULT 1,
            "uploaded_by" uuid NOT NULL,
            "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(),
            "status" character varying(50) NOT NULL DEFAULT 'ACTIVE',
            "metadata" jsonb,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_admission_documents_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_admission_documents_application"
              FOREIGN KEY ("application_id")
              REFERENCES "admission_applications"("id")
              ON DELETE CASCADE
              ON UPDATE NO ACTION,
            CONSTRAINT "FK_admission_documents_step"
              FOREIGN KEY ("step_id")
              REFERENCES "admission_steps"("id")
              ON DELETE SET NULL
              ON UPDATE NO ACTION
          )
        `);
    
        await queryRunner.query(`
          CREATE INDEX "IDX_admission_documents_application"
          ON "admission_documents" ("application_id")
        `);
    
        await queryRunner.query(`
          CREATE INDEX "IDX_admission_documents_step"
          ON "admission_documents" ("step_id")
        `);
    
        await queryRunner.query(`
          CREATE INDEX "IDX_admission_documents_type"
          ON "admission_documents" ("document_type")
        `);
      }
    
      public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admission_documents_type"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admission_documents_step"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admission_documents_application"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "admission_documents"`);
      }

}
