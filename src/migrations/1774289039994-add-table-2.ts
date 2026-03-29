import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTable21774289039994 implements MigrationInterface {
    name = 'AddTable21774289039994'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          INSERT INTO roles (id, name)
          VALUES
            (uuid_generate_v4(), 'ADMIN'),
            (uuid_generate_v4(), 'MEMBER')
          ON CONFLICT (name) DO NOTHING;
        `);
    
        await queryRunner.query(`
          INSERT INTO users (id, username, password, email, role_id, is_active, "isFirstLogin")
          SELECT
            uuid_generate_v4(),
            'admin',
            '$2b$10$e0VUVatX73X2eXxnlreLau.RX4RcgYOaTfOb/97YJda2r8fZABxjW',
            'admin@admin.com',
            r.id,
            TRUE,
            FALSE
          FROM roles r
          WHERE r.name = 'ADMIN'
            AND NOT EXISTS (
              SELECT 1 FROM users WHERE username = 'admin'
            );
        `);
      }
    
      public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          DELETE FROM users WHERE username = 'admin';
        `);
      }

}
