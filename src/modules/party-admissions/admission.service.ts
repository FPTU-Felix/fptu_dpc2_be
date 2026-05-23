import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Brackets, DataSource, Repository } from 'typeorm';
  import { OutstandingIndividual } from './entities/outstanding-individual.entity';
  import { AdmissionApplication } from './entities/admission-application.entity';
  import { AdmissionStep } from './entities/admission-step.entity';
  import { AdmissionStepData } from './entities/admission-step-data.entity';
  import { AdmissionDocument } from './entities/admission-document.entity';
  import { AdmissionTask } from './entities/admission-task.entity';
  import { AdmissionDecisionLog } from './entities/admission-decision-log.entity';
  import { AdmissionWorkflowService } from './admission-workflow.service';
  import { CreateAdmissionApplicationDto } from './dto/create-admission-application.dto';
  import { SubmitBackgroundCheckDto } from './dto/submit-background-check.dto';
  import { DraftUnionFeedbackDto } from './dto/draft-union-feedback.dto';
  import { ApproveAdmissionDto } from './dto/approve-admission.dto';
  import { RejectAdmissionDto } from './dto/reject-admission.dto';
  import { RequestChangesDto } from './dto/request-changes.dto';
  import { PendingReviewQueryDto } from './dto/pending-review-query.dto';
  import { AdmissionStepCode } from './enums/admission-step.enum';
  import {
    AdmissionOverallStatus,
    AdmissionStepStatus,
    AdmissionTaskStatus,
    OutstandingIndividualStatus,
  } from './enums/admission-status.enum';
  import { AdmissionAction } from './enums/admission-action.enum';
  
  @Injectable()
  export class AdmissionService {
    constructor(
      private readonly dataSource: DataSource,
      @InjectRepository(OutstandingIndividual)
      private readonly outstandingRepo: Repository<OutstandingIndividual>,
      @InjectRepository(AdmissionApplication)
      private readonly applicationRepo: Repository<AdmissionApplication>,
      @InjectRepository(AdmissionStep)
      private readonly stepRepo: Repository<AdmissionStep>,
      @InjectRepository(AdmissionStepData)
      private readonly stepDataRepo: Repository<AdmissionStepData>,
      @InjectRepository(AdmissionDocument)
      private readonly documentRepo: Repository<AdmissionDocument>,
      @InjectRepository(AdmissionTask)
      private readonly taskRepo: Repository<AdmissionTask>,
      @InjectRepository(AdmissionDecisionLog)
      private readonly logRepo: Repository<AdmissionDecisionLog>,
      private readonly workflowService: AdmissionWorkflowService,
    ) {}
  
    private generateApplicationCode(): string {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = `${now.getMonth() + 1}`.padStart(2, '0');
      const dd = `${now.getDate()}`.padStart(2, '0');
      const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `AD-${yyyy}${mm}${dd}-${rand}`;
    }
  
    async createApplication(actorId: string, dto: CreateAdmissionApplicationDto) {
      return this.dataSource.transaction(async (manager) => {
        const individual = await manager.findOne(OutstandingIndividual, {
          where: { id: dto.outstandingIndividualId },
        });
  
        if (!individual) {
          throw new NotFoundException('Outstanding individual not found');
        }
  
        const app = manager.create(AdmissionApplication, {
          outstandingIndividualId: dto.outstandingIndividualId,
          applicationCode: dto.applicationCode || this.generateApplicationCode(),
          currentStep: AdmissionStepCode.INITIAL_SUBMISSION,
          overallStatus: AdmissionOverallStatus.IN_PROGRESS,
          submittedBy: actorId,
          assignedCommitteeId: dto.assignedCommitteeId,
          assignedDeputySecretaryId: dto.assignedDeputySecretaryId,
          assignedSecretaryId: dto.assignedSecretaryId,
        });
  
        const savedApp = await manager.save(app);
  
        const stepDefinitions = this.workflowService.getDefaultSteps();
        const steps = stepDefinitions.map((item) =>
          manager.create(AdmissionStep, {
            applicationId: savedApp.id,
            stepCode: item.stepCode,
            stepName: item.stepName,
            sequenceNo: item.sequenceNo,
            assignedRole: item.assignedRole,
            status:
              item.stepCode === AdmissionStepCode.INITIAL_SUBMISSION
                ? AdmissionStepStatus.IN_PROGRESS
                : AdmissionStepStatus.INCOMPLETE,
            startedAt:
              item.stepCode === AdmissionStepCode.INITIAL_SUBMISSION
                ? new Date()
                : undefined,
          }),
        );
  
        await manager.save(steps);
  
        await manager.save(
          manager.create(AdmissionDecisionLog, {
            applicationId: savedApp.id,
            action: AdmissionAction.SUBMIT,
            actorId,
            actorRole: 'OUTSTANDING_INDIVIDUAL',
            comment: 'Created admission application',
          }),
        );
  
        return savedApp;
      });
    }
  
    async submitBackgroundCheck(
      applicationId: string,
      actorId: string,
      dto: SubmitBackgroundCheckDto,
    ) {
      return this.dataSource.transaction(async (manager) => {
        const application = await manager.findOne(AdmissionApplication, {
          where: { id: applicationId },
        });
  
        if (!application) {
          throw new NotFoundException('Application not found');
        }
  
        if (application.currentStep !== AdmissionStepCode.BACKGROUND_VERIFICATION) {
          throw new BadRequestException('Application is not in BACKGROUND_VERIFICATION step');
        }
  
        const step = await manager.findOne(AdmissionStep, {
          where: {
            applicationId,
            stepCode: AdmissionStepCode.BACKGROUND_VERIFICATION,
          },
        });
  
        if (!step) {
          throw new NotFoundException('Background verification step not found');
        }
  
        step.status = AdmissionStepStatus.PENDING_REVIEW;
        step.submittedBy = actorId;
        step.submittedAt = new Date();
        await manager.save(step);
  
        let stepData = await manager.findOne(AdmissionStepData, {
          where: { stepId: step.id },
        });
  
        if (!stepData) {
          stepData = manager.create(AdmissionStepData, {
            stepId: step.id,
            data: dto,
            createdBy: actorId,
          });
        } else {
          stepData.data = dto;
        }
  
        await manager.save(stepData);
  
        if (dto.verificationReportFileUrl) {
          await manager.save(
            manager.create(AdmissionDocument, {
              applicationId,
              stepId: step.id,
              documentType: 'VERIFICATION_REPORT',
              title: 'Verification Report',
              fileUrl: dto.verificationReportFileUrl,
              fileName: dto.verificationReportFileName || 'verification-report',
              uploadedBy: actorId,
            }),
          );
        }
  
        application.overallStatus = AdmissionOverallStatus.PENDING_REVIEW;
        await manager.save(application);
  
        await manager.update(
          AdmissionTask,
          { applicationId, status: AdmissionTaskStatus.PENDING },
          { status: AdmissionTaskStatus.CANCELLED },
        );
  
        await manager.save(
          manager.create(AdmissionTask, {
            applicationId,
            stepId: step.id,
            taskType: 'REVIEW_BACKGROUND_CHECK',
            assignedRole: 'DEPUTY_SECRETARY',
            assignedUserId: application.assignedDeputySecretaryId,
            status: AdmissionTaskStatus.PENDING,
            title: 'Review Background Check Results',
            description: 'Review submitted background verification results',
          }),
        );
  
        await manager.save(
          manager.create(AdmissionDecisionLog, {
            applicationId,
            stepId: step.id,
            action: AdmissionAction.SUBMIT,
            actorId,
            actorRole: 'COMMITTEE',
            comment: 'Submitted background check results',
            metadata: dto,
          }),
        );
  
        return {
          message: 'Background check results submitted successfully',
        };
      });
    }
  
    async draftUnionFeedback(
      applicationId: string,
      actorId: string,
      dto: DraftUnionFeedbackDto,
    ) {
      return this.dataSource.transaction(async (manager) => {
        const application = await manager.findOne(AdmissionApplication, {
          where: { id: applicationId },
        });
  
        if (!application) {
          throw new NotFoundException('Application not found');
        }
  
        if (application.currentStep !== AdmissionStepCode.UNION_FEEDBACK_RESOLUTION) {
          throw new BadRequestException('Application is not in UNION_FEEDBACK_RESOLUTION step');
        }
  
        const step = await manager.findOne(AdmissionStep, {
          where: {
            applicationId,
            stepCode: AdmissionStepCode.UNION_FEEDBACK_RESOLUTION,
          },
        });
  
        if (!step) {
          throw new NotFoundException('Union feedback step not found');
        }
  
        step.status = AdmissionStepStatus.PENDING_REVIEW;
        step.submittedBy = actorId;
        step.submittedAt = new Date();
        await manager.save(step);
  
        let stepData = await manager.findOne(AdmissionStepData, {
          where: { stepId: step.id },
        });
  
        if (!stepData) {
          stepData = manager.create(AdmissionStepData, {
            stepId: step.id,
            data: dto,
            createdBy: actorId,
          });
        } else {
          stepData.data = dto;
        }
  
        await manager.save(stepData);
  
        if (dto.meetingMinutesFileUrl) {
          await manager.save(
            manager.create(AdmissionDocument, {
              applicationId,
              stepId: step.id,
              documentType: 'MEETING_MINUTES',
              title: 'Meeting Minutes',
              fileUrl: dto.meetingMinutesFileUrl,
              fileName: dto.meetingMinutesFileName || 'meeting-minutes',
              uploadedBy: actorId,
            }),
          );
        }
  
        if (dto.resolutionFileUrl) {
          await manager.save(
            manager.create(AdmissionDocument, {
              applicationId,
              stepId: step.id,
              documentType: 'UNION_FEEDBACK_RESOLUTION',
              title: 'Union Feedback Resolution',
              fileUrl: dto.resolutionFileUrl,
              fileName: dto.resolutionFileName || 'union-feedback-resolution',
              uploadedBy: actorId,
            }),
          );
        }
  
        application.overallStatus = AdmissionOverallStatus.PENDING_REVIEW;
        await manager.save(application);
  
        await manager.update(
          AdmissionTask,
          { applicationId, status: AdmissionTaskStatus.PENDING },
          { status: AdmissionTaskStatus.CANCELLED },
        );
  
        await manager.save(
          manager.create(AdmissionTask, {
            applicationId,
            stepId: step.id,
            taskType: 'SECRETARY_REVIEW_UNION_FEEDBACK',
            assignedRole: 'SECRETARY',
            assignedUserId: application.assignedSecretaryId,
            status: AdmissionTaskStatus.PENDING,
            title: 'Review Union Feedback Resolution',
            description: 'Pending secretary approval',
          }),
        );
  
        await manager.save(
          manager.create(AdmissionDecisionLog, {
            applicationId,
            stepId: step.id,
            action: AdmissionAction.SUBMIT,
            actorId,
            actorRole: 'COMMITTEE',
            comment: 'Submitted union feedback resolution',
            metadata: dto,
          }),
        );
  
        return {
          message: 'Union feedback resolution submitted successfully',
        };
      });
    }
  
    async getPipelineDashboard() {
      const applications = await this.applicationRepo.find({
        relations: {
          outstandingIndividual: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
  
      const training = applications.filter((item) =>
        [
          AdmissionStepCode.INITIAL_SUBMISSION,
          AdmissionStepCode.COMMITTEE_REVIEW,
          AdmissionStepCode.DEPUTY_SECRETARY_CONTENT_APPROVAL,
        ].includes(item.currentStep),
      );
  
      const verification = applications.filter((item) =>
        [
          AdmissionStepCode.BACKGROUND_VERIFICATION,
          AdmissionStepCode.UNION_FEEDBACK_RESOLUTION,
          AdmissionStepCode.RED_STAMP_FINAL_CHECK,
        ].includes(item.currentStep),
      );
  
      const completed = applications.filter((item) =>
        [
          AdmissionStepCode.FINAL_SECRETARY_APPROVAL,
          AdmissionStepCode.COMPLETED,
        ].includes(item.currentStep),
      );
  
      return {
        summary: {
          total: applications.length,
          training: training.length,
          verification: verification.length,
          completed: completed.length,
        },
        data: {
          training,
          verification,
          completed,
        },
      };
    }
  
    async getPendingReviews(
      actorId: string,
      actorRole: 'SECRETARY' | 'DEPUTY_SECRETARY',
      query: PendingReviewQueryDto,
    ) {
      const qb = this.taskRepo
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.application', 'application')
        .leftJoinAndSelect('application.outstandingIndividual', 'outstandingIndividual')
        .leftJoinAndSelect('task.step', 'step')
        .where('task.status = :status', { status: AdmissionTaskStatus.PENDING });
  
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('task.assigned_user_id = :actorId', { actorId })
            .orWhere('task.assigned_role = :actorRole', { actorRole });
        }),
      );
  
      if (query.keyword) {
        qb.andWhere(
          new Brackets((subQb) => {
            subQb
              .where('outstandingIndividual.full_name ILIKE :keyword', {
                keyword: `%${query.keyword}%`,
              })
              .orWhere('application.application_code ILIKE :keyword', {
                keyword: `%${query.keyword}%`,
              });
          }),
        );
      }
  
      if (query.fromDate) {
        qb.andWhere('task.created_at >= :fromDate', { fromDate: query.fromDate });
      }
  
      if (query.toDate) {
        qb.andWhere('task.created_at <= :toDate', { toDate: query.toDate });
      }
  
      qb.orderBy('task.created_at', 'DESC');
  
      return qb.getMany();
    }
  
    async approveFinalAdmission(
      applicationId: string,
      actorId: string,
      dto: ApproveAdmissionDto,
    ) {
      return this.dataSource.transaction(async (manager) => {
        const application = await manager.findOne(AdmissionApplication, {
          where: { id: applicationId },
        });
  
        if (!application) {
          throw new NotFoundException('Application not found');
        }
  
        if (application.currentStep !== AdmissionStepCode.FINAL_SECRETARY_APPROVAL) {
          throw new BadRequestException('Application is not in FINAL_SECRETARY_APPROVAL step');
        }
  
        const step = await manager.findOne(AdmissionStep, {
          where: {
            applicationId,
            stepCode: AdmissionStepCode.FINAL_SECRETARY_APPROVAL,
          },
        });
  
        if (!step) {
          throw new NotFoundException('Final secretary approval step not found');
        }
  
        step.status = AdmissionStepStatus.APPROVED;
        step.approvedBy = actorId;
        step.approvedAt = new Date();
        await manager.save(step);
  
        application.currentStep = AdmissionStepCode.COMPLETED;
        application.overallStatus = AdmissionOverallStatus.COMPLETED;
        application.finalDecision = 'ADMITTED';
        application.finalDecisionNote = dto.congratulatoryMessage;
        application.completedAt = new Date();
        await manager.save(application);
  
        const individual = await manager.findOne(OutstandingIndividual, {
          where: { id: application.outstandingIndividualId },
        });
  
        if (individual) {
          individual.status = OutstandingIndividualStatus.ADMITTED;
          await manager.save(individual);
        }
  
        await manager.update(
          AdmissionTask,
          { applicationId, status: AdmissionTaskStatus.PENDING },
          {
            status: AdmissionTaskStatus.COMPLETED,
            completedAt: new Date(),
            completedBy: actorId,
          },
        );
  
        await manager.save(
          manager.create(AdmissionDecisionLog, {
            applicationId,
            stepId: step.id,
            action: AdmissionAction.FINALIZE,
            actorId,
            actorRole: 'SECRETARY',
            comment: dto.congratulatoryMessage || 'Approved final admission',
          }),
        );
  
        return {
          message: 'Final admission approved successfully',
        };
      });
    }
  
    async rejectFinalAdmission(
      applicationId: string,
      actorId: string,
      dto: RejectAdmissionDto,
    ) {
      return this.dataSource.transaction(async (manager) => {
        const application = await manager.findOne(AdmissionApplication, {
          where: { id: applicationId },
        });
  
        if (!application) {
          throw new NotFoundException('Application not found');
        }
  
        const step = await manager.findOne(AdmissionStep, {
          where: {
            applicationId,
            stepCode: AdmissionStepCode.FINAL_SECRETARY_APPROVAL,
          },
        });
  
        if (!step) {
          throw new NotFoundException('Final secretary approval step not found');
        }
  
        step.status = AdmissionStepStatus.REJECTED;
        step.rejectedBy = actorId;
        step.rejectedAt = new Date();
        step.rejectionReason = dto.reason;
        await manager.save(step);
  
        application.currentStep = AdmissionStepCode.REJECTED;
        application.overallStatus = AdmissionOverallStatus.REJECTED;
        application.finalDecision = 'REJECTED';
        application.finalDecisionNote = dto.reason;
        await manager.save(application);
  
        const individual = await manager.findOne(OutstandingIndividual, {
          where: { id: application.outstandingIndividualId },
        });
  
        if (individual) {
          individual.status = OutstandingIndividualStatus.REJECTED;
          await manager.save(individual);
        }
  
        await manager.update(
          AdmissionTask,
          { applicationId, status: AdmissionTaskStatus.PENDING },
          {
            status: AdmissionTaskStatus.COMPLETED,
            completedAt: new Date(),
            completedBy: actorId,
          },
        );
  
        await manager.save(
          manager.create(AdmissionDecisionLog, {
            applicationId,
            stepId: step.id,
            action: AdmissionAction.REJECT,
            actorId,
            actorRole: 'SECRETARY',
            comment: dto.reason,
          }),
        );
  
        return {
          message: 'Final admission rejected successfully',
        };
      });
    }
  
    async requestChanges(
      applicationId: string,
      actorId: string,
      dto: RequestChangesDto,
    ) {
      return this.dataSource.transaction(async (manager) => {
        const application = await manager.findOne(AdmissionApplication, {
          where: { id: applicationId },
        });
  
        if (!application) {
          throw new NotFoundException('Application not found');
        }
  
        const currentStep = await manager.findOne(AdmissionStep, {
          where: {
            applicationId,
            stepCode: application.currentStep,
          },
        });
  
        if (!currentStep) {
          throw new NotFoundException('Current step not found');
        }
  
        const returnStep = await manager.findOne(AdmissionStep, {
          where: {
            applicationId,
            stepCode: dto.returnToStep,
          },
        });
  
        if (!returnStep) {
          throw new NotFoundException('Return step not found');
        }
  
        currentStep.status = AdmissionStepStatus.RETURNED;
        currentStep.returnedBy = actorId;
        currentStep.returnedAt = new Date();
        currentStep.rejectionReason = dto.reason;
        await manager.save(currentStep);
  
        returnStep.status = AdmissionStepStatus.IN_PROGRESS;
        returnStep.note = dto.fieldsToCorrect || dto.reason;
        if (!returnStep.startedAt) {
          returnStep.startedAt = new Date();
        }
        await manager.save(returnStep);
  
        application.currentStep = dto.returnToStep;
        application.overallStatus = AdmissionOverallStatus.RETURNED;
        await manager.save(application);
  
        await manager.update(
          AdmissionTask,
          { applicationId, status: AdmissionTaskStatus.PENDING },
          { status: AdmissionTaskStatus.CANCELLED },
        );
  
        await manager.save(
          manager.create(AdmissionTask, {
            applicationId,
            stepId: returnStep.id,
            taskType: 'REQUEST_CHANGES',
            assignedRole: returnStep.assignedRole,
            assignedUserId:
              returnStep.assignedRole === 'COMMITTEE'
                ? application.assignedCommitteeId
                : returnStep.assignedRole === 'DEPUTY_SECRETARY'
                  ? application.assignedDeputySecretaryId
                  : application.assignedSecretaryId,
            status: AdmissionTaskStatus.PENDING,
            title: `Revise dossier at step ${returnStep.stepName}`,
            description: dto.reason,
          }),
        );
  
        await manager.save(
          manager.create(AdmissionDecisionLog, {
            applicationId,
            stepId: currentStep.id,
            action: AdmissionAction.REQUEST_CHANGES,
            actorId,
            actorRole: 'SECRETARY',
            comment: dto.reason,
            metadata: {
              returnToStep: dto.returnToStep,
              fieldsToCorrect: dto.fieldsToCorrect,
            },
          }),
        );
  
        return {
          message: 'Application returned for changes successfully',
        };
      });
    }
  
    async getApplicationDetail(applicationId: string) {
      const application = await this.applicationRepo.findOne({
        where: { id: applicationId },
        relations: {
          outstandingIndividual: true,
          steps: {
            data: true,
          },
          documents: true,
          tasks: true,
          decisionLogs: true,
        },
        order: {
          steps: {
            sequenceNo: 'ASC',
          },
          decisionLogs: {
            createdAt: 'DESC',
          },
        },
      });
  
      if (!application) {
        throw new NotFoundException('Application not found');
      }
  
      return application;
    }
  }