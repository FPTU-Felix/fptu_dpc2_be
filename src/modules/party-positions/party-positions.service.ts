import { Injectable } from '@nestjs/common';
import { CreatePartyPositionDto } from './dto/create-party-position.dto';
import { UpdatePartyPositionDto } from './dto/update-party-position.dto';

@Injectable()
export class PartyPositionsService {
  create(createPartyPositionDto: CreatePartyPositionDto) {
    return 'This action adds a new partyPosition';
  }

  findAll() {
    return `This action returns all partyPositions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} partyPosition`;
  }

  update(id: number, updatePartyPositionDto: UpdatePartyPositionDto) {
    return `This action updates a #${id} partyPosition`;
  }

  remove(id: number) {
    return `This action removes a #${id} partyPosition`;
  }
}
