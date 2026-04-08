export enum AdmissionReviewAction {
    APPROVE = 'APPROVE',                   // Duyệt bước
    RETURN = 'RETURN',                     // Trả lại để sửa
    REJECT = 'REJECT',                     // Từ chối (fail hẳn bước / hồ sơ)
    REQUEST_CHANGES = 'REQUEST_CHANGES',   // Yêu cầu chỉnh sửa (nhẹ hơn RETURN)
    CONFIRM_COMPLETION = 'CONFIRM_COMPLETION', // Xác nhận hoàn thành bước
  }

  export enum AdmissionWorkflowLogAction {
    // ===== APPLICATION LEVEL =====
    CREATE_APPLICATION = 'CREATE_APPLICATION',   // Tạo hồ sơ
    UPDATE_APPLICATION = 'UPDATE_APPLICATION',   // Cập nhật hồ sơ
    CANCEL_APPLICATION = 'CANCEL_APPLICATION',   // Huỷ hồ sơ
  
    // ===== DRAFT / SUBMISSION =====
    CREATE_DRAFT = 'CREATE_DRAFT',               // Tạo bản nháp
    UPDATE_DRAFT = 'UPDATE_DRAFT',               // Sửa nháp
    SUBMIT_STEP = 'SUBMIT_STEP',                 // Gửi bước
    RESUBMIT_STEP = 'RESUBMIT_STEP',             // Nộp lại sau khi bị trả
  
    // ===== DOCUMENT =====
    UPLOAD_DOCUMENT = 'UPLOAD_DOCUMENT',         // Upload file
    DELETE_DOCUMENT = 'DELETE_DOCUMENT',         // Xoá file
    UPDATE_DOCUMENT = 'UPDATE_DOCUMENT',         // Update file/version
  
    // ===== REVIEW ACTION =====
    APPROVE_STEP = 'APPROVE_STEP',               // Duyệt bước
    RETURN_STEP = 'RETURN_STEP',                 // Trả lại bước
    REJECT_STEP = 'REJECT_STEP',                 // Từ chối bước
  
    // ===== WORKFLOW TRANSITION =====
    MOVE_TO_NEXT_STEP = 'MOVE_TO_NEXT_STEP',     // Chuyển sang bước tiếp
    UNLOCK_NEXT_STEP = 'UNLOCK_NEXT_STEP',       // Mở khoá step
    LOCK_STEP = 'LOCK_STEP',                     // Khoá step
  
    // ===== ASSIGNMENT =====
    ASSIGN_REVIEWER = 'ASSIGN_REVIEWER',         // Giao việc
    REASSIGN_REVIEWER = 'REASSIGN_REVIEWER',     // Giao lại
  
    // ===== STATUS CHANGE =====
    UPDATE_STEP_STATUS = 'UPDATE_STEP_STATUS',   // Update status step
    UPDATE_APPLICATION_STATUS = 'UPDATE_APPLICATION_STATUS', // Update status app
  
    // ===== FINAL =====
    FINAL_APPROVE = 'FINAL_APPROVE',             // Duyệt cuối (kết nạp)
    FINAL_REJECT = 'FINAL_REJECT',               // Reject cuối
  }