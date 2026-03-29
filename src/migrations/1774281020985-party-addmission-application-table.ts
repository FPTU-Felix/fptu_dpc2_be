import { MigrationInterface, QueryRunner } from 'typeorm';

export class PartyAddmissionApplicationTable1774281020985 implements MigrationInterface {
  name = 'PartyAddmissionApplicationTable1774281020985';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "party_admission_applications_overall_status_enum" AS ENUM (
        'DRAFT',
        'SUBMITTED',
        'APPROVED',
        'REJECTED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "party_admission_applications_current_step_code_enum" AS ENUM (
        'APPLICATION',
        'REVIEW',
        'INTERVIEW',
        'FINAL'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "party_admission_applications_current_step_status_enum" AS ENUM (
        'DRAFT',
        'IN_PROGRESS',
        'COMPLETED',
        'REJECTED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "party_admission_applications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "outstandingIndividualId" uuid NOT NULL,
        "overallStatus" "party_admission_applications_overall_status_enum" NOT NULL DEFAULT 'DRAFT',
        "currentStepCode" "party_admission_applications_current_step_code_enum" NOT NULL DEFAULT 'APPLICATION',
        "currentStepStatus" "party_admission_applications_current_step_status_enum" NOT NULL DEFAULT 'DRAFT',
        "isLocked" boolean NOT NULL DEFAULT false,
        "submittedAt" TIMESTAMP,
        "admittedAt" TIMESTAMP,
        "rejectedAt" TIMESTAMP,
        "latestReturnReason" text,
        "createdById" uuid,
        "updatedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_party_admission_applications_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_party_admission_applications_outstanding_individual_id"
      ON "party_admission_applications" ("outstandingIndividualId")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_party_admission_applications_overall_status"
      ON "party_admission_applications" ("overallStatus")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_party_admission_applications_current_step_code"
      ON "party_admission_applications" ("currentStepCode")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "idx_party_admission_applications_current_step_code"
    `);

    await queryRunner.query(`
      DROP INDEX "idx_party_admission_applications_overall_status"
    `);

    await queryRunner.query(`
      DROP INDEX "idx_party_admission_applications_outstanding_individual_id"
    `);

    await queryRunner.query(`
      DROP TABLE "party_admission_applications"
    `);

    await queryRunner.query(`
      DROP TYPE "party_admission_applications_current_step_status_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "party_admission_applications_current_step_code_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "party_admission_applications_overall_status_enum"
    `);
  }
}