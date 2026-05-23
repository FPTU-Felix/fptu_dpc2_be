import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum BackgroundCheckResult {
  QUALIFIED = 'QUALIFIED',
  ISSUES_FOUND = 'ISSUES_FOUND',
}

export class SubmitBackgroundCheckDto {
  @IsEnum(BackgroundCheckResult)
  result: BackgroundCheckResult;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  issuesFound?: string;

  @IsOptional()
  @IsString()
  verificationReportFileUrl?: string;

  @IsOptional()
  @IsString()
  verificationReportFileName?: string;
}