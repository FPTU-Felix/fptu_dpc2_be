import { PartialType } from '@nestjs/mapped-types';
import { CreatePartyFeeDto } from './create-party-fee.dto';

export class UpdatePartyFeeDto extends PartialType(CreatePartyFeeDto) {}
