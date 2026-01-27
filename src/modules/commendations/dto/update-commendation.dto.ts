import { PartialType } from '@nestjs/mapped-types';
import { CreateCommendationDto } from './create-commendation.dto';

export class UpdateCommendationDto extends PartialType(CreateCommendationDto) {}
