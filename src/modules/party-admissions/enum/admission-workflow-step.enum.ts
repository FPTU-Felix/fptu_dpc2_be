export enum AdmissionWorkflowStep {
  APPLICATION = 'APPLICATION', // QCUT nộp hồ sơ
  CHI_UY_REVIEW = 'CHI_UY_REVIEW', // Chi uỷ kiểm tra
  PBT_CONTENT_REVIEW = 'PBT_CONTENT_REVIEW', // PBT duyệt nội dung
  LOCAL_VERIFICATION = 'LOCAL_VERIFICATION', // QCUT xác minh lý lịch
  RED_SEAL_CHECK = 'RED_SEAL_CHECK', // PBT kiểm tra dấu đỏ
  RESOLUTION_DRAFTING = 'RESOLUTION_DRAFTING', // Chi uỷ soạn nghị quyết
  SECRETARY_RESOLUTION_REVIEW = 'SECRETARY_RESOLUTION_REVIEW', // Bí thư duyệt nghị quyết
  COMPLETED = 'COMPLETED', // đã xong workflow
}
