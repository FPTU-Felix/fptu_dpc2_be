import { MigrationInterface, QueryRunner } from 'typeorm';

export class V114AdjustMeetingOption1774765211302 implements MigrationInterface {
  name = 'V114AdjustMeetingOption1774765211302';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meeting_opinions" DROP CONSTRAINT "FK_b37b346f4b2304af77b536431ab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_opinions" ADD CONSTRAINT "FK_b37b346f4b2304af77b536431ab" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meeting_opinions" DROP CONSTRAINT "FK_b37b346f4b2304af77b536431ab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_opinions" ADD CONSTRAINT "FK_b37b346f4b2304af77b536431ab" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
