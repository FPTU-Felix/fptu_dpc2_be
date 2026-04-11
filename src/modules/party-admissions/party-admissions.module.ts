import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartyAdmissionsService } from './party-admissions.service';
import { PartyAdmissionsController } from './party-admissions.controller';
import { PartyAdmission } from './entities/party-admission.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { AdmissionApplicationController } from './controllers/admission-application.controller';
import { AdmissionApplicationService } from './services/admission-application.service';
import { PartyAdmissionApplicationEntity } from './entities/party-admission-application.entity';
import { PartyAdmissionStepEntity } from './entities/party-admission-step.entity';
import { PartyAdmissionStepSubmissionEntity } from './entities/party-admission-step-submission.entity';
import { PartyAdmissionDocumentEntity } from './entities/party-admission-document.entity';
import { PartyAdmissionWorkflowLogEntity } from './entities/party-admission-workflow-log.entity';
import { PartyAdmissionStepReviewEntity } from './entities/party-admission-step-review.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartyAdmission,
      PartyMember,
      PartyAdmissionApplicationEntity,
      PartyAdmissionStepEntity,
      PartyAdmissionStepSubmissionEntity,
      PartyAdmissionDocumentEntity,
      PartyAdmissionWorkflowLogEntity,
      PartyAdmissionStepReviewEntity,
      User,
      Role,
    ]),
  ],
  controllers: [PartyAdmissionsController, AdmissionApplicationController],
  providers: [PartyAdmissionsService, AdmissionApplicationService],
  exports: [AdmissionApplicationService],
})
export class PartyAdmissionsModule {}
