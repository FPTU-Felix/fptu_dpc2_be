import { MigrationInterface, QueryRunner } from 'typeorm';

export class V110AddPartyAdmissionModule1773648280070 implements MigrationInterface {
  name = 'V110AddPartyAdmissionModule1773648280070';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."party_admissions_status_enum" AS ENUM('DRAFT', 'SUBMITTED', 'REVIEWING', 'READY_FOR_CEREMONY', 'COMPLETED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "party_admissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "member_id" uuid NOT NULL, "party_cell_id" uuid NOT NULL, "status" "public"."party_admissions_status_enum" NOT NULL DEFAULT 'DRAFT', "application_file_url" character varying, "resolution_file_url" character varying, "admission_documents_url" character varying, "ceremony_meeting_id" uuid, "remark" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_3e51862ee13bdce5eb974b7865" UNIQUE ("member_id"), CONSTRAINT "PK_a9f7d33af1320ad8813529ac21c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admissions" ADD CONSTRAINT "FK_3e51862ee13bdce5eb974b78650" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admissions" ADD CONSTRAINT "FK_52e8c691a7e540ba4502ef6e380" FOREIGN KEY ("party_cell_id") REFERENCES "party_cells"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admissions" ADD CONSTRAINT "FK_068e770078e24346c21c1d20af1" FOREIGN KEY ("ceremony_meeting_id") REFERENCES "meetings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "party_admissions" DROP CONSTRAINT "FK_068e770078e24346c21c1d20af1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admissions" DROP CONSTRAINT "FK_52e8c691a7e540ba4502ef6e380"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_admissions" DROP CONSTRAINT "FK_3e51862ee13bdce5eb974b78650"`,
    );
    await queryRunner.query(`DROP TABLE "party_admissions"`);
    await queryRunner.query(
      `DROP TYPE "public"."party_admissions_status_enum"`,
    );
  }
}
