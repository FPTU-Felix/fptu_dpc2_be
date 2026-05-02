import { MigrationInterface, QueryRunner } from 'typeorm';

export class V16AddingCollumForMeetingModule1770245890371 implements MigrationInterface {
  name = 'V16AddingCollumForMeetingModule1770245890371';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."meeting_attendees_method_enum" AS ENUM('PIN_CODE', 'ONLINE_EXT', 'MANUAL')`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" ADD "method" "public"."meeting_attendees_method_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" ADD "check_in_time" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ADD "attendance_secret" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ADD "is_checkin_active" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ADD "location" character varying`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."meetings_type_enum" RENAME TO "meetings_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."meetings_type_enum" AS ENUM('PERIODIC', 'EXTRAORDINARY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "type" TYPE "public"."meetings_type_enum" USING "type"::"text"::"public"."meetings_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "type" SET DEFAULT 'PERIODIC'`,
    );
    await queryRunner.query(`DROP TYPE "public"."meetings_type_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."meetings_status_enum" RENAME TO "meetings_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."meetings_status_enum" AS ENUM('SCHEDULED', 'HAPPENING', 'FINISHED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "status" TYPE "public"."meetings_status_enum" USING "status"::"text"::"public"."meetings_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'`,
    );
    await queryRunner.query(`DROP TYPE "public"."meetings_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."meetings_status_enum_old" AS ENUM('SCHEDULED', 'HAPPENING', 'COMPLETED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "status" TYPE "public"."meetings_status_enum_old" USING "status"::"text"::"public"."meetings_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'`,
    );
    await queryRunner.query(`DROP TYPE "public"."meetings_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."meetings_status_enum_old" RENAME TO "meetings_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."meetings_type_enum_old" AS ENUM('REGULAR', 'EXTRAORDINARY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "type" TYPE "public"."meetings_type_enum_old" USING "type"::"text"::"public"."meetings_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "type" SET DEFAULT 'REGULAR'`,
    );
    await queryRunner.query(`DROP TYPE "public"."meetings_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."meetings_type_enum_old" RENAME TO "meetings_type_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "location"`);
    await queryRunner.query(
      `ALTER TABLE "meetings" DROP COLUMN "is_checkin_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" DROP COLUMN "attendance_secret"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" DROP COLUMN "check_in_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" DROP COLUMN "method"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."meeting_attendees_method_enum"`,
    );
  }
}
