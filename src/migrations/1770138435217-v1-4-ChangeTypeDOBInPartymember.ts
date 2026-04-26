import { MigrationInterface, QueryRunner } from 'typeorm';

export class V14ChangeTypeDOBInPartymember1770138435217 implements MigrationInterface {
  name = 'V14ChangeTypeDOBInPartymember1770138435217';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "party_members" DROP COLUMN "date_of_birth"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_members" ADD "date_of_birth" date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "party_members" DROP COLUMN "date_of_birth"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_members" ADD "date_of_birth" TIMESTAMP`,
    );
  }
}
