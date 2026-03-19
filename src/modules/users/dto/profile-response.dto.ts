import { GenderEnum, PartyPosition } from 'src/common/enums';

export class ProfileResponseDto {
  id: string;
  userId: string;

  employeeCode: string;
  email: string;
  fullName: string;
  dob: Date;
  gender: GenderEnum;
  phone: string;
  hometown: string;
  permanentAddress: string;
  joinDate: Date;
  officialDate: Date;
  partyCardId: string;
  status: PartyPosition;
  ethnicity: string;
  religion: string;
  targetGroup: string;
  academicLevel: string;
  politicalTheoryLevel: string;
  partyCell?: {
    id: string;
    name: string;
  };
}
