import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartyMembersService } from './party-members.service';
import { PartyMembersController } from './party-members.controller';
import { PartyMember } from './entities/party-member.entity';
import { AdmissionProgress } from './entities/admission-progress.entity'; // <--- Bảng tiến độ
import { User } from '../users/entities/user.entity';
import { PartyPosition as PartyPositionEntity } from '../party-positions/entities/party-position.entity';
import { PartyMemberPosition } from '../party-positions/entities/party-member-position.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartyMember,
      PartyMemberPosition, // <-- Nhớ cái này
      PartyPositionEntity,
      AdmissionProgress, // <-- Nhớ cái này
      User, // <--- Đăng ký cả 2
    ]),
  ],
  controllers: [PartyMembersController],
  providers: [PartyMembersService],
  exports: [PartyMembersService],
})
export class PartyMembersModule {}
