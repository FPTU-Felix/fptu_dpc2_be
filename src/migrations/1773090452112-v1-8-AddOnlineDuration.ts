import { MigrationInterface, QueryRunner } from "typeorm";

export class V18AddOnlineDuration1773090452112 implements MigrationInterface {
    name = 'V18AddOnlineDuration1773090452112'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meeting_attendees" ADD "online_duration" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meeting_attendees" DROP COLUMN "online_duration"`);
    }

}
