export enum UserRole {
  ADMIN = 'ADMIN', // Quản trị kỹ thuật
  SECRETARY = 'SECRETARY', // Bí thư
  DEPUTY_SECRETARY = 'DEPUTY_SECRETARY', // Phó Bí thư
  COMMITTEE_MEMBER = 'COMMITTEE_MEMBER', // Chi Ủy
  PARTY_MEMBER = 'PARTY_MEMBER', // Đảng viên
  OUTSTANDING_INDIVIDUAL = 'OUTSTANDING_INDIVIDUAL', // Quần chúng ưu tú
}

export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum AiDataStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum MeetingType {
  PERIODIC = 'PERIODIC',
  EXTRAORDINARY = 'EXTRAORDINARY',
}

export enum MeetingFormat {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
}

export enum MeetingStatus {
  SCHEDULED = 'SCHEDULED',
  HAPPENING = 'HAPPENING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum AttendeeStatus {
  PENDING = 'PENDING', // Mới lên lịch, chưa đến giờ điểm danh (Default)
  PENDING_EXCUSE = 'PENDING_EXCUSE', // Vừa gửi đơn xin nghỉ, chờ Chi ủy duyệt
  PRESENT = 'PRESENT', // Có mặt
  ABSENT = 'ABSENT', // Vắng mặt (Không phép / Không đủ 2/3 thời gian)
  EXCUSED = 'EXCUSED', // Vắng mặt (Có phép - Đã duyệt)
}

export enum CheckInMethod {
  PIN_CODE = 'PIN_CODE', // Nhập mã PIN trên web (Offline)
  ONLINE_EXT = 'ONLINE_EXT', // Extension tự bắt (Online)
  MANUAL = 'MANUAL', // Chi ủy tích tay
}

export enum PartyPosition {
  ADMIN = 'ADMIN',
  SECRETARY = 'SECRETARY',
  DEPUTY_SECRETARY = 'DEPUTY_SECRETARY',
  COMMITTEE_MEMBER = 'COMMITTEE_MEMBER',
  PARTY_MEMBER = 'PARTY_MEMBER',
  OUTSTANDING_INDIVIDUAL = 'OUTSTANDING_INDIVIDUAL',
}

export enum AssessmentStatus {
  PENDING = 'PENDING', // Chờ duyệt
  APPROVED = 'APPROVED', // Đã duyệt (Chốt sổ)
}

export enum AssessmentRank {
  EXCELLENT = 'EXCELLENT', // Hoàn thành xuất sắc nhiệm vụ
  GOOD = 'GOOD', // Hoàn thành tốt nhiệm vụ
  AVERAGE = 'AVERAGE', // Hoàn thành nhiệm vụ
  POOR = 'POOR', // Không hoàn thành nhiệm vụ
}

export enum AdmissionStatusEnum {
  SUBMITTED = 'SUBMITTED', // Đã nộp đơn
  CHECKED = 'CHECKED', // Đã có kết quả thẩm tra
  VERIFIED = 'VERIFIED', // Đã xác minh, chờ họp chi bộ
  REJECTED = 'REJECTED', // Bị từ chối
}

export enum ParticipantType {
  ALL = 'ALL', // Tất cả Đảng viên
  COMMITTEE = 'COMMITTEE', // Ban lãnh đạo (Chi ủy)
  MANUAL = 'MANUAL', // Chọn thủ công
}

export enum NotificationType {
  ADMISSION_PROGRESS = 'ADMISSION_PROGRESS', // Tiến độ hồ sơ
  MEETING = 'MEETING', // Lịch họp
  APPROVAL = 'APPROVAL', // Duyệt thưởng/phạt
  SUBMISSION = 'SUBMISSION', // Gửi đánh giá
  HANDBOOK = 'HANDBOOK', // Sổ tay/Cẩm nang
  PARTY_FEE = 'PARTY_FEE', // Đảng phí
}

export enum MemberStatusEnum {
  MASSES = 'MASSES',
  POTENTIAL = 'POTENTIAL',
  RESERVE = 'RESERVE',
  OFFICIAL = 'OFFICIAL',
  TRANSFERRED = 'TRANSFERRED',
  DELETED = 'DELETED',
}

export enum AdmissionStepEnum {
  STEP_1_INTRO = 'STEP_1_INTRO',
  STEP_2_TRAINING = 'STEP_2_TRAINING',
  STEP_3_FILE_PREP = 'STEP_3_FILE_PREP',
  STEP_4_VERIFICATION = 'STEP_4_VERIFICATION',
  STEP_5_ADMISSION = 'STEP_5_ADMISSION',
  STEP_6_OFFICIAL = 'STEP_6_OFFICIAL',
}

export enum FeeStatusEnum {
  PAID = 'PAID',
  PENDING = 'PENDING',
  EXEMPTED = 'EXEMPTED',
}
