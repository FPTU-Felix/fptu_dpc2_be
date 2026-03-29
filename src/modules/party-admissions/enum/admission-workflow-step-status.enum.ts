export enum AdmissionWorkflowStepStatus {
    NOT_STARTED = "NOT_STARTED",   // chưa mở (bị lock)
    DRAFT = "DRAFT",               // đang soạn (áp dụng cho QCUT)
    PENDING = "PENDING",           // đã gửi, chờ người tiếp theo xử lý
    IN_PROGRESS = "IN_PROGRESS",   // đang được xử lý bởi người có trách nhiệm
    COMPLETED = "COMPLETED",       // bước đã hoàn thành
    RETURNED = "RETURNED",         // bị trả lại để bổ sung/chỉnh sửa
    REJECTED = "REJECTED",         // bị từ chối ở bước này (dừng flow)
  }