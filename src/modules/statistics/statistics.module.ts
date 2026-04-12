import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { SystemLog } from '../system/entities/system-log.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnualAssessment } from '../annual-assessments/entities/annual-assessment.entity';
import { Commendation } from '../commendations/entities/commendation.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { Discipline } from '../disciplines/entities/discipline.entity';
import { PartyFee } from '../party-fees/entities/party-fee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemLog,
      PartyMember,
      Commendation,
      Discipline,
      AnnualAssessment,
      PartyFee,
    ]),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
