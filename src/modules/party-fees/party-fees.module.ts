import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartyFeesService } from './party-fees.service';
import { PartyFeesController } from './party-fees.controller';
import { PartyFee } from './entities/party-fee.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PartyFeesCronService } from './party-fees-cron.service';
import { PartyMember } from '../party-members/entities/party-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PartyFee, PartyMember]),
    NotificationsModule,
  ],
  controllers: [PartyFeesController],
  providers: [PartyFeesService, PartyFeesCronService],
  exports: [PartyFeesService],
})
export class PartyFeesModule {}
