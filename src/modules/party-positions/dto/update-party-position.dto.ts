import { PartialType } from '@nestjs/mapped-types';
import { CreatePartyPositionDto } from './create-party-position.dto';

export class UpdatePartyPositionDto extends PartialType(CreatePartyPositionDto) {}
