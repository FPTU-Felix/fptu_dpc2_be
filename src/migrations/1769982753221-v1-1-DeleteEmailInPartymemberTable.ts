import { MigrationInterface, QueryRunner } from "typeorm";

export class V11DeleteEmailInPartymemberTable1769982753221 implements MigrationInterface {
    name = 'V11DeleteEmailInPartymemberTable1769982753221'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "party_members" DROP COLUMN "email"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "party_members" ADD "email" character varying`);
    }

}
