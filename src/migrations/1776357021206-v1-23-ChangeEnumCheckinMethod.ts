import { MigrationInterface, QueryRunner } from 'typeorm';

export class V123ChangeEnumCheckinMethod1776357021206 implements MigrationInterface {
  name = 'V123ChangeEnumCheckinMethod1776357021206';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Dọn dẹp rác cũ nếu có
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."meeting_attendees_method_enum_old"`,
    );

    // 2. Bỏ giá trị mặc định để rảnh tay thao tác
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" ALTER COLUMN "method" DROP DEFAULT`,
    );

    // 3. Đổi kiểu dữ liệu cột method sang TEXT (Bước quan trọng để lách luật Enum)
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" ALTER COLUMN "method" TYPE TEXT USING "method"::text`,
    );

    // 4. Bây giờ cột là TEXT rồi, update thoải mái không lo Enum bắt bẻ
    await queryRunner.query(
      `UPDATE "meeting_attendees" SET "method" = 'QR_CODE' WHERE "method" = 'PIN_CODE'`,
    );

    // 5. Rename Enum cũ thành _old
    await queryRunner.query(
      `ALTER TYPE "public"."meeting_attendees_method_enum" RENAME TO "meeting_attendees_method_enum_old"`,
    );

    // 6. Tạo Enum mới với giá trị QR_CODE
    await queryRunner.query(
      `CREATE TYPE "public"."meeting_attendees_method_enum" AS ENUM('QR_CODE', 'ONLINE_EXT', 'MANUAL')`,
    );

    // 7. Ép kiểu cột method từ TEXT sang Enum mới
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" ALTER COLUMN "method" TYPE "public"."meeting_attendees_method_enum" USING "method"::"public"."meeting_attendees_method_enum"`,
    );

    // 8. Đặt lại DEFAULT là QR_CODE
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" ALTER COLUMN "method" SET DEFAULT 'QR_CODE'`,
    );

    // 9. Xóa Type cũ
    await queryRunner.query(
      `DROP TYPE "public"."meeting_attendees_method_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Chuyển QR_CODE ngược về PIN_CODE
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" ALTER COLUMN "method" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" ALTER COLUMN "method" TYPE TEXT USING "method"::text`,
    );
    await queryRunner.query(
      `UPDATE "meeting_attendees" SET "method" = 'PIN_CODE' WHERE "method" = 'QR_CODE'`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."meeting_attendees_method_enum" RENAME TO "meeting_attendees_method_enum_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."meeting_attendees_method_enum" AS ENUM('PIN_CODE', 'ONLINE_EXT', 'MANUAL')`,
    );

    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" ALTER COLUMN "method" TYPE "public"."meeting_attendees_method_enum" USING "method"::"public"."meeting_attendees_method_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" ALTER COLUMN "method" SET DEFAULT 'PIN_CODE'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."meeting_attendees_method_enum_new"`,
    );
  }
}
