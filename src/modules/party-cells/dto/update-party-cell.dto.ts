import { PartialType } from '@nestjs/mapped-types';
import { CreatePartyCellDto } from './create-party-cell.dto';

export class UpdatePartyCellDto extends PartialType(CreatePartyCellDto) {}
