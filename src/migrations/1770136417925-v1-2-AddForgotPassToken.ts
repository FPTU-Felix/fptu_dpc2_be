import { MigrationInterface, QueryRunner } from 'typeorm';

export class V12AddForgotPassToken1770136417925 implements MigrationInterface {
  name = 'V12AddForgotPassToken1770136417925';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "last_forgot_password_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "last_forgot_password_at"`,
    );
  }
}
