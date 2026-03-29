import { MigrationInterface, QueryRunner } from 'typeorm';

export class V10InitFullDB1769935149149 implements MigrationInterface {
  name = 'V10InitFullDB1769935149149';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "meeting_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "attendee_id" uuid NOT NULL, "join_time" TIMESTAMP NOT NULL, "leave_time" TIMESTAMP, "duration_minutes" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_b20c0fa5d983f544149da1e4495" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."meeting_attendees_status_enum" AS ENUM('PRESENT', 'ABSENT', 'EXCUSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "meeting_attendees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "meeting_id" uuid NOT NULL, "member_id" uuid NOT NULL, "status" "public"."meeting_attendees_status_enum" NOT NULL DEFAULT 'ABSENT', "reason" character varying, CONSTRAINT "PK_b49884a61337dbfb2f3018710da" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "meeting_opinions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "meeting_id" uuid NOT NULL, "member_id" uuid NOT NULL, "content" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_578301f74900fac68744cd3e9ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."meetings_type_enum" AS ENUM('REGULAR', 'EXTRAORDINARY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."meetings_status_enum" AS ENUM('SCHEDULED', 'HAPPENING', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "meetings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "party_cell_id" uuid NOT NULL, "title" character varying NOT NULL, "type" "public"."meetings_type_enum" NOT NULL DEFAULT 'REGULAR', "online_link" character varying, "startTime" TIMESTAMP NOT NULL, "endTime" TIMESTAMP, "content" text, "status" "public"."meetings_status_enum" NOT NULL DEFAULT 'SCHEDULED', "created_by" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_aa73be861afa77eb4ed31f3ed57" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "party_cells" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "code" character varying, "address" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6d0c0bb3a7640b98cd298d88e40" UNIQUE ("code"), CONSTRAINT "PK_315e23f548e01efe5d8858133b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."admission_progress_step_enum" AS ENUM('STEP_1_INTRO', 'STEP_2_TRAINING', 'STEP_3_FILE_PREP', 'STEP_4_VERIFICATION', 'STEP_5_ADMISSION', 'STEP_6_OFFICIAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "admission_progress" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "member_id" uuid NOT NULL, "step" "public"."admission_progress_step_enum" NOT NULL, "is_completed" boolean NOT NULL DEFAULT false, "completion_date" TIMESTAMP, "note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_728a63817776cdaf2bf3714f876" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."party_fees_status_enum" AS ENUM('PAID', 'PENDING', 'EXEMPTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "party_fees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "member_id" uuid NOT NULL, "month" integer NOT NULL, "year" integer NOT NULL, "amount" numeric(10,0) NOT NULL DEFAULT '0', "status" "public"."party_fees_status_enum" NOT NULL DEFAULT 'PENDING', "payment_date" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_070d0f07f2006bb0aed352da72c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."annual_assessments_rank_enum" AS ENUM('HTXSNV', 'HTTNV', 'HTNV', 'KHTNV')`,
    );
    await queryRunner.query(
      `CREATE TABLE "annual_assessments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "member_id" uuid NOT NULL, "year" integer NOT NULL, "rank" "public"."annual_assessments_rank_enum" NOT NULL DEFAULT 'HTNV', "remarks" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_218833254d984c322a5134ba0b5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "commendations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "member_id" uuid NOT NULL, "title" character varying NOT NULL, "date" TIMESTAMP NOT NULL, "decision_number" character varying, "signing_authority" character varying, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ff77dfd683f1590734cb7713a09" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "disciplines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "member_id" uuid NOT NULL, "reason" character varying NOT NULL, "date" TIMESTAMP NOT NULL, "decision_number" character varying, "form" character varying, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9b25ea6da0741577a73c9e90aad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "party_positions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "code" character varying, "description" character varying, CONSTRAINT "UQ_b2b503408315708173c76630d33" UNIQUE ("name"), CONSTRAINT "UQ_9ab36b8484797970c95b8deb8ee" UNIQUE ("code"), CONSTRAINT "PK_e4421b7eddb9f4e0642cc13e7e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "party_member_positions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "member_id" uuid NOT NULL, "position_id" uuid NOT NULL, "party_cell_id" uuid, "appointed_date" TIMESTAMP NOT NULL, "dismissed_date" TIMESTAMP, "is_current" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e64bd6a1db44c8af326fce9cd0b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."party_members_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."party_members_status_enum" AS ENUM('MASSES', 'POTENTIAL', 'RESERVE', 'OFFICIAL', 'TRANSFERRED', 'DELETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "party_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "party_cell_id" uuid NOT NULL, "full_name" character varying NOT NULL, "dob" TIMESTAMP, "gender" "public"."party_members_gender_enum", "phone" character varying, "email" character varying, "hometown" character varying, "permanent_address" character varying, "join_date" TIMESTAMP, "official_date" TIMESTAMP, "party_card_id" character varying, "status" "public"."party_members_status_enum" NOT NULL DEFAULT 'MASSES', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_3dcc38b247864e98e3e86e18f6" UNIQUE ("user_id"), CONSTRAINT "PK_7e3b16f4f4fae338bbc6214f4de" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "username" character varying NOT NULL,
          "password" character varying NOT NULL,
          "is_active" boolean NOT NULL DEFAULT true,
          "hashed_refresh_token" character varying,
          "role_id" uuid,
          "email" character varying NOT NULL,
          "isFirstLogin" boolean NOT NULL DEFAULT true,
      
          "reset_password_token" character varying,
          "reset_password_expires" TIMESTAMP,
      
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      
          CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"),
          CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
          CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
        )`,
    );
    await queryRunner.query(
      `CREATE TABLE "system_audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "action" character varying NOT NULL, "target_table" character varying NOT NULL, "target_id" character varying, "old_value" jsonb, "new_value" jsonb, "ip_address" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7a7f1ef8b4d430e3c097272438e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "handbook_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "handbook_id" uuid NOT NULL, "title" character varying NOT NULL, "url" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d201513a9ad472b1ad414cc69d0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "handbooks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9582bcafdb10d05b44264084302" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_sessions" ADD CONSTRAINT "FK_79bd95834df6a4229d47c89ddc9" FOREIGN KEY ("attendee_id") REFERENCES "meeting_attendees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" ADD CONSTRAINT "FK_8643679c49d7234b266433bc201" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" ADD CONSTRAINT "FK_5b652a28dc0c9357eab6f2c5bc5" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_opinions" ADD CONSTRAINT "FK_b37b346f4b2304af77b536431ab" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_opinions" ADD CONSTRAINT "FK_197bbaf8030304b86ae73cbcc45" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ADD CONSTRAINT "FK_5d9e6ff1adcbd2c4b1251646a79" FOREIGN KEY ("party_cell_id") REFERENCES "party_cells"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "admission_progress" ADD CONSTRAINT "FK_35840074ee49c531d63aa6bc5e3" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_fees" ADD CONSTRAINT "FK_d7d3391431eeb1c26d4fed940cd" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" ADD CONSTRAINT "FK_0342cc197942a79f70c80b59056" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commendations" ADD CONSTRAINT "FK_b6145c47fe1c9fa7d25dda485af" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "disciplines" ADD CONSTRAINT "FK_ac15435de2541a99ece22304683" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_member_positions" ADD CONSTRAINT "FK_13852a503d1ecbc89cebbf61676" FOREIGN KEY ("member_id") REFERENCES "party_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_member_positions" ADD CONSTRAINT "FK_024d33513a12806d355e41c7a84" FOREIGN KEY ("position_id") REFERENCES "party_positions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_member_positions" ADD CONSTRAINT "FK_2b3335beefdad662520afc33dc8" FOREIGN KEY ("party_cell_id") REFERENCES "party_cells"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_members" ADD CONSTRAINT "FK_3dcc38b247864e98e3e86e18f6d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_members" ADD CONSTRAINT "FK_59fcd9e0286d8c9009113772e5d" FOREIGN KEY ("party_cell_id") REFERENCES "party_cells"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_audit_logs" ADD CONSTRAINT "FK_4c946fb94a0a262fb72579b0a08" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "handbook_links" ADD CONSTRAINT "FK_08ca89b7c2d7ed362f8cbc46cbc" FOREIGN KEY ("handbook_id") REFERENCES "handbooks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`
  INSERT INTO "roles" ("id", "name", "description")
  VALUES (uuid_generate_v4(), 'ADMIN', 'Administrator')
  ON CONFLICT ("name") DO NOTHING;
`);

    // 2. Insert admin user, mat khau mac dinh cua admin la admin - admin123
    await queryRunner.query(`
  INSERT INTO "users" (
    "id",
    "username",
    "password",
    "email",
    "role_id",
    "is_active",
    "isFirstLogin"
  )
  VALUES (
    uuid_generate_v4(),
    'admin',
    '$2b$10$mnM.PpW0d9rfbjGhfsDp.OJak6l8gvOt3rKDsaV9dMXne6ani/Yli', 
    'admin@gmail.com',
    (SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1),
    true,
    false
  )
  ON CONFLICT ("username") DO NOTHING;
`);


  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "handbook_links" DROP CONSTRAINT "FK_08ca89b7c2d7ed362f8cbc46cbc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_audit_logs" DROP CONSTRAINT "FK_4c946fb94a0a262fb72579b0a08"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_members" DROP CONSTRAINT "FK_59fcd9e0286d8c9009113772e5d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_members" DROP CONSTRAINT "FK_3dcc38b247864e98e3e86e18f6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_member_positions" DROP CONSTRAINT "FK_2b3335beefdad662520afc33dc8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_member_positions" DROP CONSTRAINT "FK_024d33513a12806d355e41c7a84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_member_positions" DROP CONSTRAINT "FK_13852a503d1ecbc89cebbf61676"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disciplines" DROP CONSTRAINT "FK_ac15435de2541a99ece22304683"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commendations" DROP CONSTRAINT "FK_b6145c47fe1c9fa7d25dda485af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annual_assessments" DROP CONSTRAINT "FK_0342cc197942a79f70c80b59056"`,
    );
    await queryRunner.query(
      `ALTER TABLE "party_fees" DROP CONSTRAINT "FK_d7d3391431eeb1c26d4fed940cd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admission_progress" DROP CONSTRAINT "FK_35840074ee49c531d63aa6bc5e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" DROP CONSTRAINT "FK_5d9e6ff1adcbd2c4b1251646a79"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_opinions" DROP CONSTRAINT "FK_197bbaf8030304b86ae73cbcc45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_opinions" DROP CONSTRAINT "FK_b37b346f4b2304af77b536431ab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" DROP CONSTRAINT "FK_5b652a28dc0c9357eab6f2c5bc5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendees" DROP CONSTRAINT "FK_8643679c49d7234b266433bc201"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_sessions" DROP CONSTRAINT "FK_79bd95834df6a4229d47c89ddc9"`,
    );
    await queryRunner.query(`DROP TABLE "handbooks"`);
    await queryRunner.query(`DROP TABLE "handbook_links"`);
    await queryRunner.query(`DROP TABLE "system_audit_logs"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "party_members"`);
    await queryRunner.query(`DROP TYPE "public"."party_members_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."party_members_gender_enum"`);
    await queryRunner.query(`DROP TABLE "party_member_positions"`);
    await queryRunner.query(`DROP TABLE "party_positions"`);
    await queryRunner.query(`DROP TABLE "disciplines"`);
    await queryRunner.query(`DROP TABLE "commendations"`);
    await queryRunner.query(`DROP TABLE "annual_assessments"`);
    await queryRunner.query(
      `DROP TYPE "public"."annual_assessments_rank_enum"`,
    );
    await queryRunner.query(`DROP TABLE "party_fees"`);
    await queryRunner.query(`DROP TYPE "public"."party_fees_status_enum"`);
    await queryRunner.query(`DROP TABLE "admission_progress"`);
    await queryRunner.query(
      `DROP TYPE "public"."admission_progress_step_enum"`,
    );
    await queryRunner.query(`DROP TABLE "party_cells"`);
    await queryRunner.query(`DROP TABLE "meetings"`);
    await queryRunner.query(`DROP TYPE "public"."meetings_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."meetings_type_enum"`);
    await queryRunner.query(`DROP TABLE "meeting_opinions"`);
    await queryRunner.query(`DROP TABLE "meeting_attendees"`);
    await queryRunner.query(
      `DROP TYPE "public"."meeting_attendees_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "meeting_sessions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
