import { MigrationInterface, QueryRunner } from "typeorm";

export class V11CreateHandbookTables1769803386655 implements MigrationInterface {
    name = 'V11CreateHandbookTables1769803386655'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "handbooks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9582bcafdb10d05b44264084302" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "handbook_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "handbook_id" uuid NOT NULL, "title" character varying NOT NULL, "url" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d201513a9ad472b1ad414cc69d0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "handbook_links" ADD CONSTRAINT "FK_08ca89b7c2d7ed362f8cbc46cbc" FOREIGN KEY ("handbook_id") REFERENCES "handbooks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "handbook_links" DROP CONSTRAINT "FK_08ca89b7c2d7ed362f8cbc46cbc"`);
        await queryRunner.query(`DROP TABLE "handbook_links"`);
        await queryRunner.query(`DROP TABLE "handbooks"`);
    }

}
