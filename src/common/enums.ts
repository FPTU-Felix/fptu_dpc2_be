export enum UserRole {
  ADMIN = 'ADMIN', // Quản trị kỹ thuật
  SECRETARY = 'SECRETARY', // Bí thư
  DEPUTY_SECRETARY = 'DEPUTY_SECRETARY', // Phó Bí thư
  COMMITTEE_MEMBER = 'COMMITTEE_MEMBER', // Ủy viên
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

// Giữ nguyên của ông: Loại cuộc họp (Định kỳ / Đột xuất)
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
  REJECTED = 'REJECTED', // Yêu cầu làm lại (Tùy chọn)
}

export enum AssessmentRank {
  EXCELLENT = 'EXCELLENT', // Hoàn thành xuất sắc nhiệm vụ
  GOOD = 'GOOD', // Hoàn thành tốt nhiệm vụ
  AVERAGE = 'AVERAGE', // Hoàn thành nhiệm vụ
  POOR = 'POOR', // Không hoàn thành nhiệm vụ
}

export enum AdmissionStatusEnum {
  SUBMITTED = 'SUBMITTED',    // Đã nộp đơn
  CHECKED = 'CHECKED',      // Đã có kết quả thẩm tra
  VERIFIED = 'VERIFIED',    // Đã xác minh, chờ họp chi bộ
  REJECTED = 'REJECTED',      // Bị từ chối
}