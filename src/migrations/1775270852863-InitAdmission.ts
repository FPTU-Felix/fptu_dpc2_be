import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitAdmission1775270852863 implements MigrationInterface {
  name = 'InitAdmission1775270852863';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== EXTENSION =====
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ===== ENUM =====
    await queryRunner.query(`
      CREATE TYPE admission_overall_status_enum AS ENUM (
        'DRAFT',
        'IN_PROGRESS',
        'RETURNED',
        'REJECTED',
        'APPROVED',
        'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE admission_step_status_enum AS ENUM (
        'NOT_STARTED',
        'IN_PROGRESS',
        'COMPLETED',
        'RETURNED',
        'REJECTED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE admission_step_enum AS ENUM (
        'APPLICATION',
        'CHI_UY_REVIEW',
        'PBT_CONTENT_REVIEW',
        'LOCAL_VERIFICATION',
        'RED_SEAL_CHECK',
        'RESOLUTION_DRAFTING',
        'SECRETARY_RESOLUTION_REVIEW',
        'COMPLETED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE admission_document_type_enum AS ENUM (
        'LY_LICH',
        'DON_XIN_VAO_DANG',
        'LY_LICH_NGUOI_XIN_VAO_DANG',
        'GIAY_GIOI_THIEU_DANG_VIEN_1',
        'GIAY_GIOI_THIEU_DANG_VIEN_2',
        'NGHI_QUYET_CHI_DOAN',
        'XAC_MINH_DIA_PHUONG',
        'NGHI_QUYET_KET_NAP_DU_THAO',
        'OTHER'
      )
    `);

    // ===== APPLICATION =====
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "party_admission_applications" (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        code varchar(50) UNIQUE NOT NULL,
        "outstandingIndividualId" uuid NOT NULL,
        "overallStatus" admission_overall_status_enum NOT NULL DEFAULT 'DRAFT',
        "currentStepCode" admission_step_enum NOT NULL DEFAULT 'APPLICATION',
        "currentStepStatus" admission_step_status_enum NOT NULL DEFAULT 'NOT_STARTED',
        "isLocked" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // ===== STEP =====
    await queryRunner.query(`
      CREATE TABLE party_admission_steps (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "applicationId" uuid NOT NULL,
        "stepCode" admission_step_enum NOT NULL,
        "stepName" varchar(255) NOT NULL,
        "stepOrder" int NOT NULL,
        status admission_step_status_enum NOT NULL DEFAULT 'NOT_STARTED',
        "isLocked" boolean NOT NULL DEFAULT true,
        "isCurrent" boolean NOT NULL DEFAULT false,
        "isCompleted" boolean NOT NULL DEFAULT false,
        "assignedToId" uuid,
        "processedById" uuid,
        "startedAt" TIMESTAMP,
        "submittedAt" TIMESTAMP,
        "processedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "returnedAt" TIMESTAMP,
        note text
      )
    `);

    await queryRunner.query(`
      ALTER TABLE party_admission_steps
      ADD CONSTRAINT fk_steps_application
      FOREIGN KEY ("applicationId")
      REFERENCES party_admission_applications(id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_steps_app_step
      ON party_admission_steps("applicationId", "stepCode")
    `);

    // ===== SUBMISSION =====
    await queryRunner.query(`
      CREATE TABLE party_admission_step_submissions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "applicationId" uuid NOT NULL,
        "stepId" uuid NOT NULL,
        "stepCode" admission_step_enum NOT NULL,
        version int NOT NULL DEFAULT 1,
        "formData" jsonb,
        note text,
        "submittedById" uuid,
        "submittedAt" TIMESTAMP,
        "isLatest" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE party_admission_step_submissions
      ADD CONSTRAINT fk_submission_app
      FOREIGN KEY ("applicationId")
      REFERENCES party_admission_applications(id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE party_admission_step_submissions
      ADD CONSTRAINT fk_submission_step
      FOREIGN KEY ("stepId")
      REFERENCES party_admission_steps(id)
      ON DELETE CASCADE
    `);

    // ===== REVIEW =====
    await queryRunner.query(`
      CREATE TABLE party_admission_step_reviews (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "applicationId" uuid NOT NULL,
        "stepId" uuid NOT NULL,
        "submissionId" uuid,
        action varchar(50) NOT NULL,
        "fromStatus" admission_step_status_enum,
        "toStatus" admission_step_status_enum,
        note text,
        reason text,
        "reviewerId" uuid,
        "processedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE party_admission_step_reviews
      ADD CONSTRAINT fk_review_app
      FOREIGN KEY ("applicationId")
      REFERENCES party_admission_applications(id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE party_admission_step_reviews
      ADD CONSTRAINT fk_review_step
      FOREIGN KEY ("stepId")
      REFERENCES party_admission_steps(id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE party_admission_step_reviews
      ADD CONSTRAINT fk_review_submission
      FOREIGN KEY ("submissionId")
      REFERENCES party_admission_step_submissions(id)
      ON DELETE SET NULL
    `);

    // ===== DOCUMENT =====
    await queryRunner.query(`
      CREATE TABLE party_admission_documents (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "applicationId" uuid NOT NULL,
        "stepId" uuid,
        "submissionId" uuid,
        "documentType" admission_document_type_enum NOT NULL,
        bucket varchar(100),
        "originalFileName" varchar(255) NOT NULL,
        "storedFileName" varchar(255) NOT NULL,
        "objectKey" varchar(500) NOT NULL,
        "mimeType" varchar(100),
        size bigint,
        version int NOT NULL DEFAULT 1,
        "isLatest" boolean NOT NULL DEFAULT true,
        description text,
        "uploadedById" uuid,
        "uploadedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE party_admission_documents
      ADD CONSTRAINT fk_doc_app
      FOREIGN KEY ("applicationId")
      REFERENCES party_admission_applications(id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE party_admission_documents
      ADD CONSTRAINT fk_doc_step
      FOREIGN KEY ("stepId")
      REFERENCES party_admission_steps(id)
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE party_admission_documents
      ADD CONSTRAINT fk_doc_submission
      FOREIGN KEY ("submissionId")
      REFERENCES party_admission_step_submissions(id)
      ON DELETE SET NULL
    `);

    // ===== INDEX =====
    await queryRunner.query(`
      CREATE INDEX idx_app_status
      ON party_admission_applications("overallStatus")
    `);

    await queryRunner.query(`
      CREATE INDEX idx_app_step
      ON party_admission_applications("currentStepCode")
    `);

    await queryRunner.query(`
      CREATE INDEX idx_doc_type
      ON party_admission_documents("documentType")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_doc_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_app_step`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_app_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_steps_app_step`);

    await queryRunner.query(`DROP TABLE IF EXISTS party_admission_documents`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS party_admission_step_reviews`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS party_admission_step_submissions`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS party_admission_steps`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS party_admission_applications`,
    );

    await queryRunner.query(`DROP TYPE IF EXISTS admission_document_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS admission_step_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS admission_step_status_enum`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS admission_overall_status_enum`,
    );
  }
}
