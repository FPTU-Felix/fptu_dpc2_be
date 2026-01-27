import { PartialType } from '@nestjs/mapped-types';
import { CreateAnnualAssessmentDto } from './create-annual-assessment.dto';

export class UpdateAnnualAssessmentDto extends PartialType(CreateAnnualAssessmentDto) {}
