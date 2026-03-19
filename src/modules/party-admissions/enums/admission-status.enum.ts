export enum OutstandingIndividualStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    ADMITTED = 'ADMITTED',
    REJECTED = 'REJECTED',
    RETURNED = 'RETURNED',
  }
  
  export enum AdmissionOverallStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    PENDING_REVIEW = 'PENDING_REVIEW',
    RETURNED = 'RETURNED',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    COMPLETED = 'COMPLETED',
  }
  
  export enum AdmissionStepStatus {
    INCOMPLETE = 'INCOMPLETE',
    IN_PROGRESS = 'IN_PROGRESS',
    PENDING_REVIEW = 'PENDING_REVIEW',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    RETURNED = 'RETURNED',
  }
  
  export enum AdmissionTaskStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
  }