import { PartialType } from '@nestjs/swagger';
import { CreatePartyAdmissionDto } from './create-party-admission.dto';

export class UpdatePartyAdmissionDto extends PartialType(CreatePartyAdmissionDto) {}
