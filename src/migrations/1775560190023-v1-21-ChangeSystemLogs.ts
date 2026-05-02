import { MigrationInterface, QueryRunner } from 'typeorm';

export class V121ChangeSystemLogs1775560190023 implements MigrationInterface {
  name = 'V121ChangeSystemLogs1775560190023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "system_audit_logs" CASCADE`);
    await queryRunner.query(
      `ALTER TABLE "system_logs" DROP CONSTRAINT "FK_a59144ababa0364e471425c5d85"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_logs" ALTER COLUMN "actor_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_logs" ADD CONSTRAINT "FK_a59144ababa0364e471425c5d85" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "system_logs" DROP CONSTRAINT "FK_a59144ababa0364e471425c5d85"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_logs" ALTER COLUMN "actor_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_logs" ADD CONSTRAINT "FK_a59144ababa0364e471425c5d85" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
