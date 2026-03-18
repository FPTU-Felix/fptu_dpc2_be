import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PartyCell } from './entities/party-cell.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PartyCellsService {
  constructor(
    @InjectRepository(PartyCell)
    private readonly partyCellRepo: Repository<PartyCell>,
  ) {}
  async findAllForDropdown() {
    return await this.partyCellRepo.find({
      select: ['id', 'name', 'code'],
      order: {
        name: 'ASC',
      },
    });
  }
}
