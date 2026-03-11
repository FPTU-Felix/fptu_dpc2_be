import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentCategory } from '../entities/document.entity';

export class UploadDocumentDto {
  @IsString()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceOrigin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  versionLabel?: string;
}