import { MigrationInterface, QueryRunner } from 'typeorm';

export class V125AddProfile1777013996727 implements MigrationInterface {
  name = 'V125AddProfile1777013996727';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "party_members" ADD "avatar_url" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "party_members" DROP COLUMN "avatar_url"`,
    );
  }
}
