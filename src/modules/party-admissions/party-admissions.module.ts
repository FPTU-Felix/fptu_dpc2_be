import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Thêm dòng này
import { PartyAdmissionsService } from './party-admissions.service';
import { PartyAdmissionsController } from './party-admissions.controller';

// Import 2 Entity này nữa
import { PartyAdmission } from './entities/party-admission.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { AdmissionApplicationController } from './controllers/admission-application.controller';
import { AdmissionApplicationService } from './services/admission-application.service';
import { PartyAdmissionApplicationEntity } from './entities/party-admission-application.entity';
import { PartyAdmissionStepEntity } from './entities/party-admission-step.entity';
import { PartyAdmissionStepSubmissionEntity } from './entities/party-admission-step-submission.entity';
import { PartyAdmissionDocumentEntity } from './entities/party-admission-document.entity';
import { AdmissionWorkflowLogService } from './services/admission-workflow-log.service';
import { PartyAdmissionWorkflowLogEntity } from './entities/party-admission-workflow-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PartyAdmission, PartyMember, PartyAdmissionApplicationEntity,
      PartyAdmissionStepEntity, PartyAdmissionStepSubmissionEntity, PartyAdmissionDocumentEntity, 
      PartyAdmissionWorkflowLogEntity
    ]),
  ],
  controllers: [PartyAdmissionsController, AdmissionApplicationController],
  providers: [PartyAdmissionsService, AdmissionApplicationService, AdmissionWorkflowLogService],
})
export class PartyAdmissionsModule {}