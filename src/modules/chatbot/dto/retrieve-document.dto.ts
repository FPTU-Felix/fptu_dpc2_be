import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export class RetrieveDocumentDto {
  @IsString()
  @MaxLength(2000)
  query: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number = 5;

  @IsOptional()
  @IsUUID()
  documentId?: string;
}