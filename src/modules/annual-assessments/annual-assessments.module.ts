import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnualAssessmentsService } from './annual-assessments.service';
import { AnnualAssessmentsController } from './annual-assessments.controller';
import { AnnualAssessment } from './entities/annual-assessment.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { Discipline } from '../disciplines/entities/discipline.entity';
import { EvaluationConfig } from './entities/evaluation-config.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnnualAssessment,
      PartyMember,
      Discipline,
      EvaluationConfig,
      User,
    ]),
    NotificationsModule,
  ],
  controllers: [AnnualAssessmentsController],
  providers: [AnnualAssessmentsService],
  exports: [AnnualAssessmentsService],
})
export class AnnualAssessmentsModule {}
