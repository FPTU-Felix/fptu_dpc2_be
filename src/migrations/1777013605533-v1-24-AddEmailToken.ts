import { MigrationInterface, QueryRunner } from 'typeorm';

export class V124AddEmailToken1777013605533 implements MigrationInterface {
  name = 'V124AddEmailToken1777013605533';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email_change_token" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email_change_expires" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "email_change_expires"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "email_change_token"`,
    );
  }
}
