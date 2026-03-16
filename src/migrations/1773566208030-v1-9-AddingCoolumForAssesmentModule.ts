import { MigrationInterface, QueryRunner } from "typeorm";

export class V19AddingCoolumForAssesmentModule1773566208030 implements MigrationInterface {
    name = 'V19AddingCoolumForAssesmentModule1773566208030'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "annual_assessments" DROP CONSTRAINT "FK_0342cc197942a79f70c80b59056"`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP CONSTRAINT "FK_b6145c47fe1c9fa7d25dda485af"`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP CONSTRAINT "FK_ac15435de2541a99ece22304683"`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" DROP COLUMN "rank"`);
        await queryRunner.query(`DROP TYPE "public"."annual_assessments_rank_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."annual_assessments_self_rank_enum" AS ENUM('EXCELLENT', 'GOOD', 'AVERAGE', 'POOR')`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" ADD "self_rank" "public"."annual_assessments_self_rank_enum" NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."annual_assessments_final_rank_enum" AS ENUM('EXCELLENT', 'GOOD', 'AVERAGE', 'POOR')`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" ADD "final_rank" "public"."annual_assessments_final_rank_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."annual_assessments_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" ADD "status" "public"."annual_assessments_status_enum" NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" ADD "assessment_file_url" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" ADD "reviewer_id" uuid`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" ADD "reviewed_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD "decision_file_url" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD "created_by" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD "decision_file_url" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD "created_by" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD "title" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD "date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP COLUMN "decision_number"`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD "decision_number" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP COLUMN "signing_authority"`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD "signing_authority" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP COLUMN "reason"`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD "reason" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD "date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP COLUMN "decision_number"`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD "decision_number" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP COLUMN "form"`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD "form" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" ADD CONSTRAINT "UQ_ecea00c0abedeb080e53153d27d" UNIQUE ("member_id", "year")`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" ADD CONSTRAINT "FK_0342cc197942a79f70c80b59056" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" ADD CONSTRAINT "FK_f4159e49ff328fb4da0b6d5b0d0" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD CONSTRAINT "FK_b6145c47fe1c9fa7d25dda485af" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD CONSTRAINT "FK_b8ce993df302ee3a9b8d96a7ff9" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD CONSTRAINT "FK_ac15435de2541a99ece22304683" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD CONSTRAINT "FK_db82b8b2bd57e5bcde1aa9e13a4" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disciplines" DROP CONSTRAINT "FK_db82b8b2bd57e5bcde1aa9e13a4"`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP CONSTRAINT "FK_ac15435de2541a99ece22304683"`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP CONSTRAINT "FK_b8ce993df302ee3a9b8d96a7ff9"`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP CONSTRAINT "FK_b6145c47fe1c9fa7d25dda485af"`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" DROP CONSTRAINT "FK_f4159e49ff328fb4da0b6d5b0d0"`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" DROP CONSTRAINT "FK_0342cc197942a79f70c80b59056"`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" DROP CONSTRAINT "UQ_ecea00c0abedeb080e53153d27d"`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP COLUMN "form"`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD "form" character varying`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP COLUMN "decision_number"`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD "decision_number" character varying`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD "date" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP COLUMN "reason"`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD "reason" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP COLUMN "signing_authority"`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD "signing_authority" character varying`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP COLUMN "decision_number"`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD "decision_number" character varying`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD "date" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD "title" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP COLUMN "decision_file_url"`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "commendations" DROP COLUMN "decision_file_url"`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" DROP COLUMN "reviewed_at"`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" DROP COLUMN "reviewer_id"`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" DROP COLUMN "assessment_file_url"`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."annual_assessments_status_enum"`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" DROP COLUMN "final_rank"`);
        await queryRunner.query(`DROP TYPE "public"."annual_assessments_final_rank_enum"`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" DROP COLUMN "self_rank"`);
        await queryRunner.query(`DROP TYPE "public"."annual_assessments_self_rank_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."annual_assessments_rank_enum" AS ENUM('HTXSNV', 'HTTNV', 'HTNV', 'KHTNV')`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" ADD "rank" "public"."annual_assessments_rank_enum" NOT NULL DEFAULT 'HTNV'`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD CONSTRAINT "FK_ac15435de2541a99ece22304683" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "commendations" ADD CONSTRAINT "FK_b6145c47fe1c9fa7d25dda485af" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "annual_assessments" ADD CONSTRAINT "FK_0342cc197942a79f70c80b59056" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
