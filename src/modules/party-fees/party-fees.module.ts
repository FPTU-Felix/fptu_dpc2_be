import { Module } from '@nestjs/common';
import { PartyFeesService } from './party-fees.service';
import { PartyFeesController } from './party-fees.controller';

@Module({
  controllers: [PartyFeesController],
  providers: [PartyFeesService],
})
export class PartyFeesModule {}
