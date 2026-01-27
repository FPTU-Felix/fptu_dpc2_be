import { Module } from '@nestjs/common';
import { AnnualAssessmentsService } from './annual-assessments.service';
import { AnnualAssessmentsController } from './annual-assessments.controller';

@Module({
  controllers: [AnnualAssessmentsController],
  providers: [AnnualAssessmentsService],
})
export class AnnualAssessmentsModule {}
