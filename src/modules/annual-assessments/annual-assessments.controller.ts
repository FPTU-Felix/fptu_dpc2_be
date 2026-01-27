import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AnnualAssessmentsService } from './annual-assessments.service';
import { CreateAnnualAssessmentDto } from './dto/create-annual-assessment.dto';
import { UpdateAnnualAssessmentDto } from './dto/update-annual-assessment.dto';

@Controller('annual-assessments')
export class AnnualAssessmentsController {
  constructor(private readonly annualAssessmentsService: AnnualAssessmentsService) {}

  @Post()
  create(@Body() createAnnualAssessmentDto: CreateAnnualAssessmentDto) {
    return this.annualAssessmentsService.create(createAnnualAssessmentDto);
  }

  @Get()
  findAll() {
    return this.annualAssessmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.annualAssessmentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAnnualAssessmentDto: UpdateAnnualAssessmentDto) {
    return this.annualAssessmentsService.update(+id, updateAnnualAssessmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.annualAssessmentsService.remove(+id);
  }
}
