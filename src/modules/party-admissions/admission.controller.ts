import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
  } from '@nestjs/common';
  import { AdmissionService } from './admission.service';
  import { CreateAdmissionApplicationDto } from './dto/create-admission-application.dto';
  import { SubmitBackgroundCheckDto } from './dto/submit-background-check.dto';
  import { DraftUnionFeedbackDto } from './dto/draft-union-feedback.dto';
  import { ApproveAdmissionDto } from './dto/approve-admission.dto';
  import { RejectAdmissionDto } from './dto/reject-admission.dto';
  import { RequestChangesDto } from './dto/request-changes.dto';
  import { PendingReviewQueryDto } from './dto/pending-review-query.dto';
  
  @Controller('admissions')
  export class AdmissionController {
    constructor(private readonly admissionService: AdmissionService) {}
  
    @Post()
    async createApplication(
      @Body() dto: CreateAdmissionApplicationDto,
      @Req() req: any,
    ) {
      return this.admissionService.createApplication(req.user.id, dto);
    }
  
    @Post(':id/background-check')
    async submitBackgroundCheck(
      @Param('id') id: string,
      @Body() dto: SubmitBackgroundCheckDto,
      @Req() req: any,
    ) {
      return this.admissionService.submitBackgroundCheck(id, req.user.id, dto);
    }
  
    @Post(':id/union-feedback')
    async draftUnionFeedback(
      @Param('id') id: string,
      @Body() dto: DraftUnionFeedbackDto,
      @Req() req: any,
    ) {
      return this.admissionService.draftUnionFeedback(id, req.user.id, dto);
    }
  
    @Get('pipeline/dashboard')
    async getPipelineDashboard() {
      return this.admissionService.getPipelineDashboard();
    }
  
    @Get('pending-reviews')
    async getPendingReviews(
      @Query() query: PendingReviewQueryDto,
      @Req() req: any,
    ) {
      return this.admissionService.getPendingReviews(
        req.user.id,
        req.user.role,
        query,
      );
    }
  
    @Get(':id')
    async getApplicationDetail(@Param('id') id: string) {
      return this.admissionService.getApplicationDetail(id);
    }
  
    @Patch(':id/final-approve')
    async approveFinalAdmission(
      @Param('id') id: string,
      @Body() dto: ApproveAdmissionDto,
      @Req() req: any,
    ) {
      return this.admissionService.approveFinalAdmission(id, req.user.id, dto);
    }
  
    @Patch(':id/final-reject')
    async rejectFinalAdmission(
      @Param('id') id: string,
      @Body() dto: RejectAdmissionDto,
      @Req() req: any,
    ) {
      return this.admissionService.rejectFinalAdmission(id, req.user.id, dto);
    }
  
    @Patch(':id/request-changes')
    async requestChanges(
      @Param('id') id: string,
      @Body() dto: RequestChangesDto,
      @Req() req: any,
    ) {
      return this.admissionService.requestChanges(id, req.user.id, dto);
    }
  }