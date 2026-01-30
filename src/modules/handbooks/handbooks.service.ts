import { Injectable } from '@nestjs/common';
import { CreateHandbookDto } from './dto/create-handbook.dto';
import { UpdateHandbookDto } from './dto/update-handbook.dto';

@Injectable()
export class HandbooksService {
  create(createHandbookDto: CreateHandbookDto) {
    return 'This action adds a new handbook';
  }

  findAll() {
    return `This action returns all handbooks`;
  }

  findOne(id: number) {
    return `This action returns a #${id} handbook`;
  }

  update(id: number, updateHandbookDto: UpdateHandbookDto) {
    return `This action updates a #${id} handbook`;
  }

  remove(id: number) {
    return `This action removes a #${id} handbook`;
  }
}
