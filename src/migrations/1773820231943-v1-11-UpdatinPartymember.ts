import { MigrationInterface, QueryRunner } from "typeorm";

export class V111UpdatinPartymember1773820231943 implements MigrationInterface {
    name = 'V111UpdatinPartymember1773820231943'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "party_admissions" DROP CONSTRAINT "FK_e0b44af873f38222508c41c63da"`);
        await queryRunner.query(`ALTER TABLE "party_admissions" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "party_members" ADD "ethnicity" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "party_members" ADD "religion" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "party_members" ADD "target_group" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "party_members" ADD "academic_level" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "party_members" ADD "political_theory_level" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ADD "member_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ADD CONSTRAINT "UQ_3e51862ee13bdce5eb974b78650" UNIQUE ("member_id")`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ADD "application_file_url" character varying`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ADD "resolution_file_url" character varying`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ADD "ceremony_meeting_id" uuid`);
        await queryRunner.query(`ALTER TYPE "public"."party_admissions_status_enum" RENAME TO "party_admissions_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."party_admissions_status_enum" AS ENUM('DRAFT', 'SUBMITTED', 'REVIEWING', 'READY_FOR_CEREMONY', 'COMPLETED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ALTER COLUMN "status" TYPE "public"."party_admissions_status_enum" USING "status"::"text"::"public"."party_admissions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ALTER COLUMN "status" SET DEFAULT 'DRAFT'`);
        await queryRunner.query(`DROP TYPE "public"."party_admissions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ADD CONSTRAINT "FK_3e51862ee13bdce5eb974b78650" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ADD CONSTRAINT "FK_068e770078e24346c21c1d20af1" FOREIGN KEY ("ceremony_meeting_id") REFERENCES "meetings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "party_admissions" DROP CONSTRAINT "FK_068e770078e24346c21c1d20af1"`);
        await queryRunner.query(`ALTER TABLE "party_admissions" DROP CONSTRAINT "FK_3e51862ee13bdce5eb974b78650"`);
        await queryRunner.query(`CREATE TYPE "public"."party_admissions_status_enum_old" AS ENUM('SUBMITTED', 'REVIEWING', 'CHECKED', 'VERIFIED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ALTER COLUMN "status" TYPE "public"."party_admissions_status_enum_old" USING "status"::"text"::"public"."party_admissions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ALTER COLUMN "status" SET DEFAULT 'CHECKED'`);
        await queryRunner.query(`DROP TYPE "public"."party_admissions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."party_admissions_status_enum_old" RENAME TO "party_admissions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "party_admissions" DROP COLUMN "ceremony_meeting_id"`);
        await queryRunner.query(`ALTER TABLE "party_admissions" DROP COLUMN "resolution_file_url"`);
        await queryRunner.query(`ALTER TABLE "party_admissions" DROP COLUMN "application_file_url"`);
        await queryRunner.query(`ALTER TABLE "party_admissions" DROP CONSTRAINT "UQ_3e51862ee13bdce5eb974b78650"`);
        await queryRunner.query(`ALTER TABLE "party_admissions" DROP COLUMN "member_id"`);
        await queryRunner.query(`ALTER TABLE "party_members" DROP COLUMN "political_theory_level"`);
        await queryRunner.query(`ALTER TABLE "party_members" DROP COLUMN "academic_level"`);
        await queryRunner.query(`ALTER TABLE "party_members" DROP COLUMN "target_group"`);
        await queryRunner.query(`ALTER TABLE "party_members" DROP COLUMN "religion"`);
        await queryRunner.query(`ALTER TABLE "party_members" DROP COLUMN "ethnicity"`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ADD "user_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "party_admissions" ADD CONSTRAINT "FK_e0b44af873f38222508c41c63da" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
