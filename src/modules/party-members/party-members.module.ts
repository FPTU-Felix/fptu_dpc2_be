import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartyMembersService } from './party-members.service';
import { PartyMembersController } from './party-members.controller';
import { PartyMember } from './entities/party-member.entity';
import { AdmissionProgress } from './entities/admission-progress.entity'; // <--- Bảng tiến độ

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartyMember,
      AdmissionProgress, // <--- Đăng ký cả 2
    ]),
  ],
  controllers: [PartyMembersController],
  providers: [PartyMembersService],
})
export class PartyMembersModule {}
