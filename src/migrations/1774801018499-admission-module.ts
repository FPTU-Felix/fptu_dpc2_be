import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdmissionModule1774801018499 implements MigrationInterface {
  name = 'AdmissionModule1774801018499';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ================= ENUM =================

    const createEnum = async (name: string, values: string[]) => {
      await queryRunner.query(`
            DO $$
            BEGIN
              CREATE TYPE "${name}" AS ENUM (${values.map((v) => `'${v}'`).join(',')});
            EXCEPTION
              WHEN duplicate_object THEN NULL;
            END
            $$;
          `);
    };

    await createEnum('party_admission_applications_overall_status_enum', [
      'DRAFT',
      'IN_PROGRESS',
      'RETURNED',
      'REJECTED',
      'APPROVED',
      'CANCELLED',
    ]);

    await createEnum('party_admission_workflow_step_enum', [
      'DRAFT',
      'APPLICATION_SUBMISSION',
      'CHI_UY_REVIEW',
      'PBT_CONTENT_REVIEW',
      'LOCAL_VERIFICATION',
      'RED_SEAL_CHECK',
      'RESOLUTION_DRAFTING',
      'SECRETARY_RESOLUTION_REVIEW',
      'COMPLETED',
    ]);

    await createEnum('party_admission_step_status_enum', [
      'NOT_STARTED',
      'DRAFT',
      'PENDING',
      'IN_PROGRESS',
      'COMPLETED',
      'RETURNED',
      'REJECTED',
    ]);

    await createEnum('party_admission_document_type_enum', [
      'LY_LICH',
      'DON_XIN_VAO_DANG',
      'LY_LICH_NGUOI_XIN_VAO_DANG',
      'GIAY_GIOI_THIEU_DANG_VIEN_1',
      'GIAY_GIOI_THIEU_DANG_VIEN_2',
      'NGHI_QUYET_CHI_DOAN',
      'XAC_MINH_DIA_PHUONG',
      'NGHI_QUYET_KET_NAP_DU_THAO',
      'OTHER',
    ]);

    // ================= APPLICATION =================

    await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "party_admission_applications" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "outstandingIndividualId" uuid NOT NULL,
            "overallStatus" "party_admission_applications_overall_status_enum" NOT NULL DEFAULT 'DRAFT',
            "currentStepCode" "party_admission_workflow_step_enum" NOT NULL DEFAULT 'DRAFT',
            "currentStepStatus" "party_admission_step_status_enum" NOT NULL DEFAULT 'NOT_STARTED',
            "isLocked" boolean NOT NULL DEFAULT false,
            "submittedAt" timestamp NULL,
            "admittedAt" timestamp NULL,
            "rejectedAt" timestamp NULL,
            "latestReturnReason" text NULL,
            "createdById" uuid NULL,
            "updatedById" uuid NULL,
            "createdAt" timestamp NOT NULL DEFAULT now(),
            "updatedAt" timestamp NOT NULL DEFAULT now()
          );
        `);

    await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_pa_app_individual
          ON party_admission_applications("outstandingIndividualId");
        `);

    // ================= STEPS =================

    await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "party_admission_steps" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "applicationId" uuid NOT NULL,
            "stepCode" "party_admission_workflow_step_enum" NOT NULL,
            "stepName" varchar(255) NOT NULL,
            "stepOrder" int NOT NULL,
            "status" "party_admission_step_status_enum" NOT NULL DEFAULT 'IN_PROGRESS',
            "isLocked" boolean NOT NULL DEFAULT true,
            "isCurrent" boolean NOT NULL DEFAULT false,
            "isCompleted" boolean NOT NULL DEFAULT false,
            "assignedToId" uuid NULL,
            "processedById" uuid NULL,
            "startedAt" timestamp NULL,
            "submittedAt" timestamp NULL,
            "processedAt" timestamp NULL,
            "completedAt" timestamp NULL,
            "returnedAt" timestamp NULL,
            "rejectedAt" timestamp NULL,
            "note" text NULL,
            "resultNote" text NULL,
            "returnReason" text NULL,
            "rejectionReason" text NULL,
            "createdAt" timestamp NOT NULL DEFAULT now(),
            "updatedAt" timestamp NOT NULL DEFAULT now(),
    
            CONSTRAINT fk_steps_application
              FOREIGN KEY ("applicationId")
              REFERENCES "party_admission_applications"("id")
              ON DELETE CASCADE
          );
        `);

    await queryRunner.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS uq_steps_app_step
          ON party_admission_steps("applicationId","stepCode");
        `);

    // ================= STEP SUBMISSIONS =================

    await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "party_admission_step_submissions" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "applicationId" uuid NOT NULL,
            "stepId" uuid NOT NULL,
            "stepCode" "party_admission_workflow_step_enum" NOT NULL,
            "version" int DEFAULT 1,
            "status" "party_admission_step_status_enum" DEFAULT 'PENDING',
            "formData" jsonb NULL,
            "note" text NULL,
            "submittedById" uuid NULL,
            "submittedAt" timestamp NULL,
            "isLatest" boolean DEFAULT true,
            "createdAt" timestamp DEFAULT now(),
    
            CONSTRAINT fk_submission_app
              FOREIGN KEY ("applicationId")
              REFERENCES "party_admission_applications"("id")
              ON DELETE CASCADE,
    
            CONSTRAINT fk_submission_step
              FOREIGN KEY ("stepId")
              REFERENCES "party_admission_steps"("id")
              ON DELETE CASCADE
          );
        `);

    // ================= DOCUMENTS =================

    await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "party_admission_documents" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "applicationId" uuid NOT NULL,
            "stepId" uuid NULL,
            "submissionId" uuid NULL,
            "documentType" "party_admission_document_type_enum" NOT NULL,
            "originalFileName" varchar(255),
            "storedFileName" varchar(255),
            "objectKey" varchar(500),
            "mimeType" varchar(100),
            "size" bigint,
            "version" int DEFAULT 1,
            "isLatest" boolean DEFAULT true,
            "uploadedById" uuid NULL,
            "uploadedAt" timestamp NULL,
            "createdAt" timestamp DEFAULT now(),
    
            CONSTRAINT fk_doc_app
              FOREIGN KEY ("applicationId")
              REFERENCES "party_admission_applications"("id")
              ON DELETE CASCADE,
    
            CONSTRAINT fk_doc_step
              FOREIGN KEY ("stepId")
              REFERENCES "party_admission_steps"("id")
              ON DELETE SET NULL,
    
            CONSTRAINT fk_doc_submission
              FOREIGN KEY ("submissionId")
              REFERENCES "party_admission_step_submissions"("id")
              ON DELETE SET NULL
          );
        `);

    // ================= STEP REVIEWS =================

    await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "party_admission_step_reviews" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "applicationId" uuid NOT NULL,
            "stepId" uuid NOT NULL,
            "action" varchar(50),
            "fromStatus" varchar(50),
            "toStatus" varchar(50),
            "note" text,
            "reason" text,
            "reviewerId" uuid,
            "processedAt" timestamp,
            "createdAt" timestamp DEFAULT now(),
    
            CONSTRAINT fk_review_app
              FOREIGN KEY ("applicationId")
              REFERENCES "party_admission_applications"("id")
              ON DELETE CASCADE,
    
            CONSTRAINT fk_review_step
              FOREIGN KEY ("stepId")
              REFERENCES "party_admission_steps"("id")
              ON DELETE CASCADE
          );
        `);

    // ================= WORKFLOW LOG =================

    await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "party_admission_workflow_logs" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "applicationId" uuid NOT NULL,
            "stepId" uuid NULL,
            "action" varchar(100),
            "fromStatus" varchar(50),
            "toStatus" varchar(50),
            "fromStepCode" varchar(50),
            "toStepCode" varchar(50),
            "message" text,
            "metadata" jsonb,
            "actorId" uuid,
            "actorRole" varchar(50),
            "createdAt" timestamp DEFAULT now(),
    
            CONSTRAINT fk_log_app
              FOREIGN KEY ("applicationId")
              REFERENCES "party_admission_applications"("id")
              ON DELETE CASCADE,
    
            CONSTRAINT fk_log_step
              FOREIGN KEY ("stepId")
              REFERENCES "party_admission_steps"("id")
              ON DELETE SET NULL
          );
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS party_admission_workflow_logs`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS party_admission_step_reviews`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS party_admission_documents`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS party_admission_step_submissions`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS party_admission_steps`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS party_admission_applications`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS party_admission_document_type_enum`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS party_admission_step_status_enum`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS party_admission_workflow_step_enum`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS party_admission_applications_overall_status_enum`,
    );
  }
}
