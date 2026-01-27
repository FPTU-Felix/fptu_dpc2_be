import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartyPositionsService } from './party-positions.service';
import { PartyPositionsController } from './party-positions.controller';
import { PartyPosition } from './entities/party-position.entity';
import { PartyMemberPosition } from './entities/party-member-position.entity'; // <--- Nhớ cái này

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartyPosition,
      PartyMemberPosition, // <--- Đăng ký cả 2 bảng
    ]),
  ],
  controllers: [PartyPositionsController],
  providers: [PartyPositionsService],
  exports: [PartyPositionsService], // Export ra nếu module khác cần check chức vụ
})
export class PartyPositionsModule {}
