import { MigrationInterface, QueryRunner } from "typeorm";

export class V17UpdateMeetingCollum1772601921602 implements MigrationInterface {
    name = 'V17UpdateMeetingCollum1772601921602'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meeting_attendees" ADD "proof_url" character varying`);
        await queryRunner.query(`ALTER TABLE "meeting_attendees" ADD "check_out_time" TIMESTAMP`);
        await queryRunner.query(`CREATE TYPE "public"."meetings_format_enum" AS ENUM('OFFLINE', 'ONLINE')`);
        await queryRunner.query(`ALTER TABLE "meetings" ADD "format" "public"."meetings_format_enum" NOT NULL DEFAULT 'OFFLINE'`);
        await queryRunner.query(`ALTER TABLE "meetings" ADD "minutes_url" character varying`);
        await queryRunner.query(`ALTER TYPE "public"."meeting_attendees_status_enum" RENAME TO "meeting_attendees_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."meeting_attendees_status_enum" AS ENUM('PENDING', 'PENDING_EXCUSE', 'PRESENT', 'ABSENT', 'EXCUSED')`);
        await queryRunner.query(`ALTER TABLE "meeting_attendees" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "meeting_attendees" ALTER COLUMN "status" TYPE "public"."meeting_attendees_status_enum" USING "status"::"text"::"public"."meeting_attendees_status_enum"`);
        await queryRunner.query(`ALTER TABLE "meeting_attendees" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."meeting_attendees_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."meeting_attendees_status_enum_old" AS ENUM('PRESENT', 'ABSENT', 'EXCUSED')`);
        await queryRunner.query(`ALTER TABLE "meeting_attendees" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "meeting_attendees" ALTER COLUMN "status" TYPE "public"."meeting_attendees_status_enum_old" USING "status"::"text"::"public"."meeting_attendees_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "meeting_attendees" ALTER COLUMN "status" SET DEFAULT 'ABSENT'`);
        await queryRunner.query(`DROP TYPE "public"."meeting_attendees_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."meeting_attendees_status_enum_old" RENAME TO "meeting_attendees_status_enum"`);
        await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "minutes_url"`);
        await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "format"`);
        await queryRunner.query(`DROP TYPE "public"."meetings_format_enum"`);
        await queryRunner.query(`ALTER TABLE "meeting_attendees" DROP COLUMN "check_out_time"`);
        await queryRunner.query(`ALTER TABLE "meeting_attendees" DROP COLUMN "proof_url"`);
    }

}
