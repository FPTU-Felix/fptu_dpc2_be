import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class AskChatbotDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  topK?: number;

  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsUUID()
  documentVersionId?: string;
}