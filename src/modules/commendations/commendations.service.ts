import { Injectable } from '@nestjs/common';
import { CreateCommendationDto } from './dto/create-commendation.dto';
import { UpdateCommendationDto } from './dto/update-commendation.dto';

@Injectable()
export class CommendationsService {
  create(createCommendationDto: CreateCommendationDto) {
    return 'This action adds a new commendation';
  }

  findAll() {
    return `This action returns all commendations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} commendation`;
  }

  update(id: number, updateCommendationDto: UpdateCommendationDto) {
    return `This action updates a #${id} commendation`;
  }

  remove(id: number) {
    return `This action removes a #${id} commendation`;
  }
}
