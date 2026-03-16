import { Injectable } from '@nestjs/common';
import { CreatePartyAdmissionDto } from './dto/create-party-admission.dto';
import { UpdatePartyAdmissionDto } from './dto/update-party-admission.dto';

@Injectable()
export class PartyAdmissionsService {
  create(createPartyAdmissionDto: CreatePartyAdmissionDto) {
    return 'This action adds a new partyAdmission';
  }

  findAll() {
    return `This action returns all partyAdmissions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} partyAdmission`;
  }

  update(id: number, updatePartyAdmissionDto: UpdatePartyAdmissionDto) {
    return `This action updates a #${id} partyAdmission`;
  }

  remove(id: number) {
    return `This action removes a #${id} partyAdmission`;
  }
}
