export enum AdmissionOverallStatus {
    DRAFT = "DRAFT",               // đang tạo nháp
    IN_PROGRESS = "IN_PROGRESS",   // đang trong quy trình xử lý
    RETURNED = "RETURNED",         // bị trả lại ở bước hiện tại
    REJECTED = "REJECTED",         // bị từ chối hẳn
    APPROVED = "APPROVED",         // hoàn tất toàn bộ
    CANCELLED = "CANCELLED",       // hủy hồ sơ
  }