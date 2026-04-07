// day la trang thai cua moi step, tra loi rieng cau hoi : rieng buoc nay hien nay ra sao 
export enum AdmissionWorkflowStepStatus {
  NOT_STARTED = "NOT_STARTED",   // chua toi luot o buoc nay
  IN_PROGRESS = "IN_PROGRESS",   // dang la buoc active hien tai
  COMPLETED = "COMPLETED",       // buoc nay da xong
  RETURNED = "RETURNED",         // buoc nay da tra lai ho so
  REJECTED = "REJECTED",         // buoc nay da tu choi ho so
}