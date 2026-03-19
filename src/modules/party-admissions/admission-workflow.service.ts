import { BadRequestException, Injectable } from '@nestjs/common';
import { AdmissionStepCode } from './enums/admission-step.enum';

@Injectable()
export class AdmissionWorkflowService {
  getDefaultSteps() {
    return [
      {
        stepCode: AdmissionStepCode.INITIAL_SUBMISSION,
        stepName: 'Initial Submission',
        sequenceNo: 1,
        assignedRole: 'OUTSTANDING_INDIVIDUAL',
      },
      {
        stepCode: AdmissionStepCode.COMMITTEE_REVIEW,
        stepName: 'Committee Review',
        sequenceNo: 2,
        assignedRole: 'COMMITTEE',
      },
      {
        stepCode: AdmissionStepCode.DEPUTY_SECRETARY_CONTENT_APPROVAL,
        stepName: 'Deputy Secretary Content Approval',
        sequenceNo: 3,
        assignedRole: 'DEPUTY_SECRETARY',
      },
      {
        stepCode: AdmissionStepCode.BACKGROUND_VERIFICATION,
        stepName: 'Background Verification',
        sequenceNo: 4,
        assignedRole: 'COMMITTEE',
      },
      {
        stepCode: AdmissionStepCode.UNION_FEEDBACK_RESOLUTION,
        stepName: 'Union Feedback Resolution',
        sequenceNo: 5,
        assignedRole: 'COMMITTEE',
      },
      {
        stepCode: AdmissionStepCode.RED_STAMP_FINAL_CHECK,
        stepName: 'Red Stamp Final Check',
        sequenceNo: 6,
        assignedRole: 'DEPUTY_SECRETARY',
      },
      {
        stepCode: AdmissionStepCode.FINAL_SECRETARY_APPROVAL,
        stepName: 'Final Secretary Approval',
        sequenceNo: 7,
        assignedRole: 'SECRETARY',
      },
    ];
  }

  getNextStep(current: AdmissionStepCode): AdmissionStepCode {
    switch (current) {
      case AdmissionStepCode.INITIAL_SUBMISSION:
        return AdmissionStepCode.COMMITTEE_REVIEW;
      case AdmissionStepCode.COMMITTEE_REVIEW:
        return AdmissionStepCode.DEPUTY_SECRETARY_CONTENT_APPROVAL;
      case AdmissionStepCode.DEPUTY_SECRETARY_CONTENT_APPROVAL:
        return AdmissionStepCode.BACKGROUND_VERIFICATION;
      case AdmissionStepCode.BACKGROUND_VERIFICATION:
        return AdmissionStepCode.UNION_FEEDBACK_RESOLUTION;
      case AdmissionStepCode.UNION_FEEDBACK_RESOLUTION:
        return AdmissionStepCode.RED_STAMP_FINAL_CHECK;
      case AdmissionStepCode.RED_STAMP_FINAL_CHECK:
        return AdmissionStepCode.FINAL_SECRETARY_APPROVAL;
      case AdmissionStepCode.FINAL_SECRETARY_APPROVAL:
        return AdmissionStepCode.COMPLETED;
      default:
        throw new BadRequestException(`No next step found for ${current}`);
    }
  }
}