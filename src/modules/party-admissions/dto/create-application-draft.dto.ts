import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateApplicationDraftDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reasonForJoining: string;

  @IsOptional()
  @IsString()
  partyApplicationLetter?: string; // don xin vao dang

  @IsOptional()
  @IsString()
  personalBiography?: string; // li lich cua nguoi xin vao dang

  @IsOptional()
  @IsString()
  partyMemberRecommendation?: string; // giay gioi thieu cua dang vien chinh thuc

  @IsOptional()
  @IsString()
  youthUnionResolution?: string; // nghi quyet gioi thieu

  @IsOptional()
  @IsString()
  otherDocuments?: string; // cac van ban khac
}
