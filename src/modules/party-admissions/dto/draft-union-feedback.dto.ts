import { IsOptional, IsString } from 'class-validator';

export class DraftUnionFeedbackDto {
  @IsString()
  feedbackSummary: string;

  @IsOptional()
  @IsString()
  meetingMinutesFileUrl?: string;

  @IsOptional()
  @IsString()
  meetingMinutesFileName?: string;

  @IsOptional()
  @IsString()
  resolutionFileUrl?: string;

  @IsOptional()
  @IsString()
  resolutionFileName?: string;
}