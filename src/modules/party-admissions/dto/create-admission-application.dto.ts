import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAdmissionApplicationDto {
  @IsUUID()
  outstandingIndividualId: string;

  @IsOptional()
  @IsUUID()
  assignedCommitteeId?: string;

  @IsOptional()
  @IsUUID()
  assignedDeputySecretaryId?: string;

  @IsOptional()
  @IsUUID()
  assignedSecretaryId?: string;

  @IsOptional()
  @IsString()
  applicationCode?: string;
}