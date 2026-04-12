import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UsersAdminController } from './user.admin.controller';
import { Role } from '../roles/entities/role.entity';
import { UsersCommitteeController } from './users.committee.controller';
import { MailModule } from '../mail/mail.module';
import { PartyAdmissionsModule } from '../party-admissions/party-admissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role]), MailModule, PartyAdmissionsModule],
  controllers: [
    UsersController,
    UsersAdminController,
    UsersCommitteeController,
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
