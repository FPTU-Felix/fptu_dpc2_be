import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class RetrieveDocumentDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number = 5;

  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsUUID()
  documentVersionId?: string;
}