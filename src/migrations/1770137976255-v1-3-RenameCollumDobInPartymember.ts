import { MigrationInterface, QueryRunner } from "typeorm";

export class V13RenameCollumDobInPartymember1770137976255 implements MigrationInterface {
    name = 'V13RenameCollumDobInPartymember1770137976255'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "party_members" RENAME COLUMN "dob" TO "date_of_birth"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "party_members" RENAME COLUMN "date_of_birth" TO "dob"`);
    }

}
