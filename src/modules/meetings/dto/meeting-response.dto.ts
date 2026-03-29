import { Exclude, Expose, Type } from 'class-transformer';
import { AttendeeStatus } from 'src/common/enums';

@Exclude()
export class RoleResponseDto {
  @Expose()
  name: string;
}

@Exclude()
export class UserResponseDto {
  @Expose()
  email: string;

  @Expose()
  username: string;

  @Expose()
  @Type(() => RoleResponseDto)
  role: RoleResponseDto;
}

@Exclude()
export class PartyMemberResponseDto {
  @Expose()
  id: string;

  @Expose()
  fullName: string;

  @Expose()
  partyCardId: string;

  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;
}

@Exclude()
export class AttendeeResponseDto {
  @Expose()
  id: string;

  @Expose()
  status: AttendeeStatus;

  @Expose()
  reason: string;

  @Expose()
  proofUrl: string;

  @Expose()
  @Type(() => PartyMemberResponseDto)
  member: PartyMemberResponseDto;
}

@Exclude()
export class MeetingResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  time: Date;

  @Expose()
  location: string;

  @Expose()
  isCheckinActive: boolean;

  @Expose()
  onlineLink: string;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => AttendeeResponseDto)
  attendees: AttendeeResponseDto[];
}
