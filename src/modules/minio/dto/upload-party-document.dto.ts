import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { PartyDocumentType } from "./party-document-type.enum";

export class UploadPartyDocumentDto {
  @IsEnum(PartyDocumentType)
  documentType: PartyDocumentType;

  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @IsOptional()
  @IsString()
  stepCode?: string;

  @IsOptional()
  @IsString()
  note?: string;
}