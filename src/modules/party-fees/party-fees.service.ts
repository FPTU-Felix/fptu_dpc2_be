import { Injectable } from '@nestjs/common';
import { CreatePartyFeeDto } from './dto/create-party-fee.dto';
import { UpdatePartyFeeDto } from './dto/update-party-fee.dto';

@Injectable()
export class PartyFeesService {
  create(createPartyFeeDto: CreatePartyFeeDto) {
    return 'This action adds a new partyFee';
  }

  findAll() {
    return `This action returns all partyFees`;
  }

  findOne(id: number) {
    return `This action returns a #${id} partyFee`;
  }

  update(id: number, updatePartyFeeDto: UpdatePartyFeeDto) {
    return `This action updates a #${id} partyFee`;
  }

  remove(id: number) {
    return `This action removes a #${id} partyFee`;
  }
}
