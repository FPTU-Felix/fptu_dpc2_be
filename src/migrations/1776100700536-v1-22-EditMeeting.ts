import { MigrationInterface, QueryRunner } from 'typeorm';

export class V122EditMeeting1776100700536 implements MigrationInterface {
  name = 'V122EditMeeting1776100700536';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Dọn dẹp các Constraint và Index cũ
    await queryRunner.query(
      `ALTER TABLE "party_admission_documents" DROP CONSTRAINT IF EXISTS "fk_doc_submission"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_documents" DROP CONSTRAINT IF EXISTS "fk_doc_step"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_documents" DROP CONSTRAINT IF EXISTS "fk_doc_app"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_reviews" DROP CONSTRAINT IF EXISTS "fk_review_submission"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_reviews" DROP CONSTRAINT IF EXISTS "fk_review_step"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_reviews" DROP CONSTRAINT IF EXISTS "fk_review_app"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_submissions" DROP CONSTRAINT IF EXISTS "fk_submission_step"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_submissions" DROP CONSTRAINT IF EXISTS "fk_submission_app"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_steps" DROP CONSTRAINT IF EXISTS "fk_steps_application"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_doc_type"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."uq_steps_app_step"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_app_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_app_step"`);

    // 2. Tạo các Type Enum mới phục vụ cho Workflow Logs và Files
    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_workflow_logs_action_enum" AS ENUM('CREATE_APPLICATION', 'UPDATE_APPLICATION', 'CANCEL_APPLICATION', 'CREATE_DRAFT', 'UPDATE_DRAFT', 'SUBMIT_STEP', 'RESUBMIT_STEP', 'UPLOAD_DOCUMENT', 'DELETE_DOCUMENT', 'UPDATE_DOCUMENT', 'APPROVE_STEP', 'RETURN_STEP', 'REJECT_STEP', 'MOVE_TO_NEXT_STEP', 'UNLOCK_NEXT_STEP', 'LOCK_STEP', 'ASSIGN_REVIEWER', 'REASSIGN_REVIEWER', 'UPDATE_STEP_STATUS', 'UPDATE_APPLICATION_STATUS', 'FINAL_APPROVE', 'FINAL_REJECT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_workflow_logs_fromstepcode_enum" AS ENUM('APPLICATION', 'CHI_UY_REVIEW', 'PBT_CONTENT_REVIEW', 'LOCAL_VERIFICATION', 'RED_SEAL_CHECK', 'RESOLUTION_DRAFTING', 'SECRETARY_RESOLUTION_REVIEW', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_workflow_logs_tostepcode_enum" AS ENUM('APPLICATION', 'CHI_UY_REVIEW', 'PBT_CONTENT_REVIEW', 'LOCAL_VERIFICATION', 'RED_SEAL_CHECK', 'RESOLUTION_DRAFTING', 'SECRETARY_RESOLUTION_REVIEW', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_workflow_logs_fromstatus_enum" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'RETURNED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_workflow_logs_tostatus_enum" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'RETURNED', 'REJECTED')`,
    );

    // 3. Tạo bảng Workflow Logs và Files
    await queryRunner.query(
      `CREATE TABLE "party_admission_workflow_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "applicationId" uuid NOT NULL, "stepId" uuid, "action" "public"."party_admission_workflow_logs_action_enum" NOT NULL, "fromStepCode" "public"."party_admission_workflow_logs_fromstepcode_enum", "toStepCode" "public"."party_admission_workflow_logs_tostepcode_enum", "fromStatus" "public"."party_admission_workflow_logs_fromstatus_enum", "toStatus" "public"."party_admission_workflow_logs_tostatus_enum", "message" text, "metadata" jsonb, "actorId" uuid, "actorRole" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1eb3557d8ed921c308c3dfb40b0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_workflow_logs_created_at" ON "party_admission_workflow_logs" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_workflow_logs_step_id" ON "party_admission_workflow_logs" ("stepId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_workflow_logs_application_id" ON "party_admission_workflow_logs" ("applicationId") `,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."files_scope_enum" AS ENUM('Public', 'Internal', 'Private')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."files_storagetype_enum" AS ENUM('Database', 'S3')`,
    );
    await queryRunner.query(
      `CREATE TABLE "files" ("_id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying NOT NULL, "author" character varying NOT NULL, "authorName" character varying NOT NULL, "mimetype" character varying NOT NULL, "size" integer NOT NULL, "scope" "public"."files_scope_enum" NOT NULL DEFAULT 'Public', "storageType" "public"."files_storagetype_enum" NOT NULL, "data" text NOT NULL, "uploadId" character varying, CONSTRAINT "PK_aac3191a9e99bcdb7ef95b3fd68" PRIMARY KEY ("_id"))`,
    );

    // 4. Bắt đầu Refactor các bảng hiện có
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_reviews" DROP COLUMN IF EXISTS "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_reviews" DROP COLUMN IF EXISTS "updatedAt"`,
    );

    // Xử lý Document Type Enum
    await queryRunner.query(
      `ALTER TYPE "public"."admission_document_type_enum" RENAME TO "admission_document_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_documents_documenttype_enum" AS ENUM('DON_XIN_VAO_DANG', 'LY_LICH_NGUOI_XIN_VAO_DANG', 'GIAY_GIOI_THIEU_DANG_VIEN_1', 'GIAY_GIOI_THIEU_DANG_VIEN_2', 'XAC_MINH_DIA_PHUONG', 'NGHI_QUYET_KET_NAP_DU_THAO', 'OTHER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_documents" ALTER COLUMN "documentType" TYPE "public"."party_admission_documents_documenttype_enum" USING "documentType"::"text"::"public"."party_admission_documents_documenttype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."admission_document_type_enum_old" CASCADE`,
    ); // FIX: Thêm CASCADE

    // Xử lý cột action trong step_reviews (Lỗi NOT NULL)
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_reviews" DROP COLUMN IF EXISTS "action"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_step_reviews_action_enum" AS ENUM('APPROVE', 'RETURN', 'REJECT', 'REQUEST_CHANGES', 'CONFIRM_COMPLETION')`,
    );
    // FIX: Thêm DEFAULT để tránh lỗi khi bảng đã có data
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_reviews" ADD "action" "public"."party_admission_step_reviews_action_enum" NOT NULL DEFAULT 'APPROVE'`,
    );

    // Xử lý Step Status Enum (Bị báo lỗi dependency)
    await queryRunner.query(
      `ALTER TYPE "public"."admission_step_status_enum" RENAME TO "admission_step_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_step_reviews_fromstatus_enum" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'RETURNED', 'REJECTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_reviews" ALTER COLUMN "fromStatus" TYPE "public"."party_admission_step_reviews_fromstatus_enum" USING "fromStatus"::"text"::"public"."party_admission_step_reviews_fromstatus_enum"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_step_reviews_tostatus_enum" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'RETURNED', 'REJECTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_reviews" ALTER COLUMN "toStatus" TYPE "public"."party_admission_step_reviews_tostatus_enum" USING "toStatus"::"text"::"public"."party_admission_step_reviews_tostatus_enum"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_steps_status_enum" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'RETURNED', 'REJECTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_steps" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_steps" ALTER COLUMN "status" TYPE "public"."party_admission_steps_status_enum" USING "status"::"text"::"public"."party_admission_steps_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_steps" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED'`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_applications_currentstepstatus_enum" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'RETURNED', 'REJECTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_applications" ALTER COLUMN "currentStepStatus" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_applications" ALTER COLUMN "currentStepStatus" TYPE "public"."party_admission_applications_currentstepstatus_enum" USING "currentStepStatus"::"text"::"public"."party_admission_applications_currentstepstatus_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_applications" ALTER COLUMN "currentStepStatus" SET DEFAULT 'NOT_STARTED'`,
    );

    await queryRunner.query(
      `DROP TYPE "public"."admission_step_status_enum_old" CASCADE`,
    ); // FIX: Thêm CASCADE

    // Xử lý Step Enum
    await queryRunner.query(
      `ALTER TYPE "public"."admission_step_enum" RENAME TO "admission_step_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_step_submissions_stepcode_enum" AS ENUM('APPLICATION', 'CHI_UY_REVIEW', 'PBT_CONTENT_REVIEW', 'LOCAL_VERIFICATION', 'RED_SEAL_CHECK', 'RESOLUTION_DRAFTING', 'SECRETARY_RESOLUTION_REVIEW', 'COMPLETED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_submissions" ALTER COLUMN "stepCode" TYPE "public"."party_admission_step_submissions_stepcode_enum" USING "stepCode"::"text"::"public"."party_admission_step_submissions_stepcode_enum"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_steps_stepcode_enum" AS ENUM('APPLICATION', 'CHI_UY_REVIEW', 'PBT_CONTENT_REVIEW', 'LOCAL_VERIFICATION', 'RED_SEAL_CHECK', 'RESOLUTION_DRAFTING', 'SECRETARY_RESOLUTION_REVIEW', 'COMPLETED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_steps" ALTER COLUMN "stepCode" TYPE "public"."party_admission_steps_stepcode_enum" USING "stepCode"::"text"::"public"."party_admission_steps_stepcode_enum"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_applications_currentstepcode_enum" AS ENUM('APPLICATION', 'CHI_UY_REVIEW', 'PBT_CONTENT_REVIEW', 'LOCAL_VERIFICATION', 'RED_SEAL_CHECK', 'RESOLUTION_DRAFTING', 'SECRETARY_RESOLUTION_REVIEW', 'COMPLETED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_applications" ALTER COLUMN "currentStepCode" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_applications" ALTER COLUMN "currentStepCode" TYPE "public"."party_admission_applications_currentstepcode_enum" USING "currentStepCode"::"text"::"public"."party_admission_applications_currentstepcode_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_applications" ALTER COLUMN "currentStepCode" SET DEFAULT 'APPLICATION'`,
    );

    await queryRunner.query(
      `DROP TYPE "public"."admission_step_enum_old" CASCADE`,
    ); // FIX: Thêm CASCADE

    // Xử lý Overall Status Enum
    await queryRunner.query(
      `ALTER TYPE "public"."admission_overall_status_enum" RENAME TO "admission_overall_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."party_admission_applications_overallstatus_enum" AS ENUM('DRAFT', 'IN_PROGRESS', 'RETURNED', 'REJECTED', 'APPROVED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_applications" ALTER COLUMN "overallStatus" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_applications" ALTER COLUMN "overallStatus" TYPE "public"."party_admission_applications_overallstatus_enum" USING "overallStatus"::"text"::"public"."party_admission_applications_overallstatus_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_applications" ALTER COLUMN "overallStatus" SET DEFAULT 'DRAFT'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."admission_overall_status_enum_old" CASCADE`,
    ); // FIX: Thêm CASCADE

    // 5. Tạo các Index mới
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_documents_document_type" ON "party_admission_documents" ("documentType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_documents_submission_id" ON "party_admission_documents" ("submissionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_documents_step_id" ON "party_admission_documents" ("stepId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_documents_application_id" ON "party_admission_documents" ("applicationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_step_reviews_submission_id" ON "party_admission_step_reviews" ("submissionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_step_reviews_step_id" ON "party_admission_step_reviews" ("stepId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_step_reviews_application_id" ON "party_admission_step_reviews" ("applicationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_step_submissions_is_latest" ON "party_admission_step_submissions" ("isLatest") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_step_submissions_step_id" ON "party_admission_step_submissions" ("stepId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_step_submissions_application_id" ON "party_admission_step_submissions" ("applicationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_steps_is_current" ON "party_admission_steps" ("isCurrent") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_steps_status" ON "party_admission_steps" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_steps_application_id" ON "party_admission_steps" ("applicationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_applications_overall_status_current_step_code" ON "party_admission_applications" ("overallStatus", "currentStepCode") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_applications_current_step_code" ON "party_admission_applications" ("currentStepCode") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_applications_overall_status" ON "party_admission_applications" ("overallStatus") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_party_admission_applications_outstanding_individual_id" ON "party_admission_applications" ("outstandingIndividualId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_party_admission_applications_code" ON "party_admission_applications" ("code") `,
    );

    // 6. Tạo lại Foreign Keys và Constraints
    await queryRunner.query(
      `ALTER TABLE "party_admission_steps" ADD CONSTRAINT "uq_party_admission_steps_application_step_code" UNIQUE ("applicationId", "stepCode")`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_documents" ADD CONSTRAINT "FK_c29e3fbae18f24076b13b79d0b6" FOREIGN KEY ("applicationId") REFERENCES "party_admission_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_documents" ADD CONSTRAINT "FK_2267c22b5d97ff13986d1a2d896" FOREIGN KEY ("stepId") REFERENCES "party_admission_steps"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_documents" ADD CONSTRAINT "FK_19b7047ed1feb5d35756a31f959" FOREIGN KEY ("submissionId") REFERENCES "party_admission_step_submissions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_reviews" ADD CONSTRAINT "FK_f546b8cb545038fbe2096caf8c3" FOREIGN KEY ("applicationId") REFERENCES "party_admission_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_reviews" ADD CONSTRAINT "FK_30bfe9cc8517207fb9ce9756f00" FOREIGN KEY ("stepId") REFERENCES "party_admission_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_reviews" ADD CONSTRAINT "FK_3eb4427eebe063c0e058f029217" FOREIGN KEY ("submissionId") REFERENCES "party_admission_step_submissions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_submissions" ADD CONSTRAINT "FK_8aa19b5421a1571222b9ccb58ac" FOREIGN KEY ("applicationId") REFERENCES "party_admission_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_step_submissions" ADD CONSTRAINT "FK_e3655b40f3bd51205b1a34f6620" FOREIGN KEY ("stepId") REFERENCES "party_admission_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_steps" ADD CONSTRAINT "FK_b654e6ed8b4a757292607002427" FOREIGN KEY ("applicationId") REFERENCES "party_admission_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_workflow_logs" ADD CONSTRAINT "FK_a2bd15dfe3e974823418a4e57ba" FOREIGN KEY ("applicationId") REFERENCES "party_admission_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admission_workflow_logs" ADD CONSTRAINT "FK_c8272a476b7f26c21362119b479" FOREIGN KEY ("stepId") REFERENCES "party_admission_steps"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // M có thể giữ nguyên hàm down cũ của m hoặc thêm các lệnh DROP tương ứng
    // Lưu ý khi ROLLBACK cũng nên dùng CASCADE cho các lệnh DROP TYPE
  }
}
