import { PartialType } from '@nestjs/swagger';
import { CreateCommendationDto } from './create-commendation.dto';

export class UpdateCommendationDto extends PartialType(CreateCommendationDto) {}
