import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PartyAdmissionsService } from './party-admissions.service';
import { CreatePartyAdmissionDto } from './dto/create-party-admission.dto';
import { UpdatePartyAdmissionDto } from './dto/update-party-admission.dto';

@Controller('party-admissions')
export class PartyAdmissionsController {
  constructor(private readonly partyAdmissionsService: PartyAdmissionsService) {}

  @Post()
  create(@Body() createPartyAdmissionDto: CreatePartyAdmissionDto) {
    return this.partyAdmissionsService.create(createPartyAdmissionDto);
  }

  @Get()
  findAll() {
    return this.partyAdmissionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partyAdmissionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePartyAdmissionDto: UpdatePartyAdmissionDto) {
    return this.partyAdmissionsService.update(+id, updatePartyAdmissionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.partyAdmissionsService.remove(+id);
  }
}
