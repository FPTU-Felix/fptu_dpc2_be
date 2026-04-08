import { MigrationInterface, QueryRunner } from 'typeorm';

export class V120SystemLogs1775558068686 implements MigrationInterface {
  name = 'V120SystemLogs1775558068686';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "system_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "actor_id" uuid NOT NULL, "action_type" character varying NOT NULL, "entity_name" character varying NOT NULL, "entity_id" character varying NOT NULL, "details" jsonb, "ip_address" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_56861c4b9d16aa90259f4ce0a2c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_logs" ADD CONSTRAINT "FK_a59144ababa0364e471425c5d85" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "system_logs" DROP CONSTRAINT "FK_a59144ababa0364e471425c5d85"`,
    );
    await queryRunner.query(`DROP TABLE "system_logs"`);
  }
}
