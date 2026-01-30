import { PartialType } from '@nestjs/mapped-types';
import { CreateHandbookDto } from './create-handbook.dto';

export class UpdateHandbookDto extends PartialType(CreateHandbookDto) {}
