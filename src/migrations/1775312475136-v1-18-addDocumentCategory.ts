import { MigrationInterface, QueryRunner } from "typeorm";

export class V118AddDocumentCategory1775312475136 implements MigrationInterface {
    name = 'V118AddDocumentCategory1775312475136'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_b89e90c19762165e9647686650e"`);
        await queryRunner.query(`ALTER TABLE "document_categories" DROP CONSTRAINT "PK_672faab02d41a41ffd92ecd69e1"`);
        await queryRunner.query(`ALTER TABLE "document_categories" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "document_categories" ADD "id" uuid NOT NULL DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "document_categories" ADD CONSTRAINT "PK_672faab02d41a41ffd92ecd69e1" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "category_id"`);
        await queryRunner.query(`ALTER TABLE "documents" ADD "category_id" uuid`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_b89e90c19762165e9647686650e" FOREIGN KEY ("category_id") REFERENCES "document_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_b89e90c19762165e9647686650e"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "category_id"`);
        await queryRunner.query(`ALTER TABLE "documents" ADD "category_id" integer`);
        await queryRunner.query(`ALTER TABLE "document_categories" DROP CONSTRAINT "PK_672faab02d41a41ffd92ecd69e1"`);
        await queryRunner.query(`ALTER TABLE "document_categories" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "document_categories" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "document_categories" ADD CONSTRAINT "PK_672faab02d41a41ffd92ecd69e1" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_b89e90c19762165e9647686650e" FOREIGN KEY ("category_id") REFERENCES "document_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
