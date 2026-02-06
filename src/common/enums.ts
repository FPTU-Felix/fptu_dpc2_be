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

export enum MeetingType {
  PERIODIC = 'PERIODIC',
  EXTRAORDINARY = 'EXTRAORDINARY',
}

export enum MeetingStatus {
  SCHEDULED = 'SCHEDULED',
  HAPPENING = 'HAPPENING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum AttendeeStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  EXCUSED = 'EXCUSED', // Có phép
}

export enum CheckInMethod {
  PIN_CODE = 'PIN_CODE', // Nhập mã PIN trên web (Offline)
  ONLINE_EXT = 'ONLINE_EXT', // Extension tự bắt (Online)
  MANUAL = 'MANUAL', // Chi ủy tích tay
}

export enum PartyPosition {
  ADMIN = 'ADMIN', // Quản trị kỹ thuật
  SECRETARY = 'SECRETARY', // Bí thư
  DEPUTY_SECRETARY = 'DEPUTY_SECRETARY', // Phó Bí thư
  COMMITTEE_MEMBER = 'COMMITTEE_MEMBER', // Ủy viên
  PARTY_MEMBER = 'PARTY_MEMBER', // Đảng viên
  OUTSTANDING_INDIVIDUAL = 'OUTSTANDING_INDIVIDUAL', // Quần chúng ưu tú
}
