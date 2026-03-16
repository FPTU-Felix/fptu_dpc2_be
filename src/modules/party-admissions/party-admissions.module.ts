import { Module } from '@nestjs/common';
import { PartyAdmissionsService } from './party-admissions.service';
import { PartyAdmissionsController } from './party-admissions.controller';

@Module({
  controllers: [PartyAdmissionsController],
  providers: [PartyAdmissionsService],
})
export class PartyAdmissionsModule {}
