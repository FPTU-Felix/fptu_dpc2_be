import { Injectable } from '@nestjs/common';
import { CreatePartyCellDto } from './dto/create-party-cell.dto';
import { UpdatePartyCellDto } from './dto/update-party-cell.dto';

@Injectable()
export class PartyCellsService {
  create(createPartyCellDto: CreatePartyCellDto) {
    return 'This action adds a new partyCell';
  }

  findAll() {
    return `This action returns all partyCells`;
  }

  findOne(id: number) {
    return `This action returns a #${id} partyCell`;
  }

  update(id: number, updatePartyCellDto: UpdatePartyCellDto) {
    return `This action updates a #${id} partyCell`;
  }

  remove(id: number) {
    return `This action removes a #${id} partyCell`;
  }
}
