import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutstandingIndividual1773836310103 implements MigrationInterface {
  name = 'CreateOutstandingIndividual1773836310103';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "outstanding_individuals" (
              "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
              "full_name" character varying(255) NOT NULL,
              "date_of_birth" date,
              "gender" character varying(20),
              "email" character varying(255),
              "phone" character varying(50),
              "organization_unit_id" uuid,
              "status" character varying(50) NOT NULL DEFAULT 'IN_PROGRESS',
              "created_at" TIMESTAMP NOT NULL DEFAULT now(),
              "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
              "deleted_at" TIMESTAMP,
              CONSTRAINT "PK_outstanding_individuals_id" PRIMARY KEY ("id")
            )
          `);

    await queryRunner.query(`
            CREATE INDEX "IDX_outstanding_individuals_status"
            ON "outstanding_individuals" ("status")
          `);

    await queryRunner.query(`
            CREATE INDEX "IDX_outstanding_individuals_org_unit"
            ON "outstanding_individuals" ("organization_unit_id")
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_outstanding_individuals_org_unit"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_outstanding_individuals_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "outstanding_individuals"`);
 
  }
}
