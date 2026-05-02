import { MigrationInterface, QueryRunner } from 'typeorm';

export class V116AdjustPartyFee1775074364805 implements MigrationInterface {
  name = 'V116AdjustPartyFee1775074364805';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "party_fees" ADD "recorded_by" uuid`);
    await queryRunner.query(
      `ALTER TABLE "party_fees" ALTER COLUMN "amount" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_fees" ALTER COLUMN "amount" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_fees" ADD CONSTRAINT "UQ_05d309196610dfaf51404c6cb75" UNIQUE ("member_id", "month", "year")`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_fees" ADD CONSTRAINT "FK_104a56a20d944281711a92a084a" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "party_fees" DROP CONSTRAINT "FK_104a56a20d944281711a92a084a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_fees" DROP CONSTRAINT "UQ_05d309196610dfaf51404c6cb75"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_fees" ALTER COLUMN "amount" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_fees" ALTER COLUMN "amount" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_fees" DROP COLUMN "recorded_by"`,
    );
  }
}
