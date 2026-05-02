import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @MaxLength(2000)
  fileUrl: string;

  @IsString()
  @MaxLength(1000)
  objectName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bucket?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mimeType?: string;
}
