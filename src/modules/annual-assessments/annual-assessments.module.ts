import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnualAssessmentsService } from './annual-assessments.service';
import { AnnualAssessmentsController } from './annual-assessments.controller';
import { AnnualAssessment } from './entities/annual-assessment.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { Discipline } from '../disciplines/entities/discipline.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnnualAssessment, PartyMember, Discipline]),
  ],
  controllers: [AnnualAssessmentsController],
  providers: [AnnualAssessmentsService],
  exports: [AnnualAssessmentsService],
})
export class AnnualAssessmentsModule {}
