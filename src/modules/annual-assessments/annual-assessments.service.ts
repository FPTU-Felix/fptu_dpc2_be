import { Injectable } from '@nestjs/common';
import { CreateAnnualAssessmentDto } from './dto/create-annual-assessment.dto';
import { UpdateAnnualAssessmentDto } from './dto/update-annual-assessment.dto';

@Injectable()
export class AnnualAssessmentsService {
  create(createAnnualAssessmentDto: CreateAnnualAssessmentDto) {
    return 'This action adds a new annualAssessment';
  }

  findAll() {
    return `This action returns all annualAssessments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} annualAssessment`;
  }

  update(id: number, updateAnnualAssessmentDto: UpdateAnnualAssessmentDto) {
    return `This action updates a #${id} annualAssessment`;
  }

  remove(id: number) {
    return `This action removes a #${id} annualAssessment`;
  }
}
