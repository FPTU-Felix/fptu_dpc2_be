import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PartyFeesService } from './party-fees.service';
import { CreatePartyFeeDto } from './dto/create-party-fee.dto';
import { UpdatePartyFeeDto } from './dto/update-party-fee.dto';

@Controller('party-fees')
export class PartyFeesController {
  constructor(private readonly partyFeesService: PartyFeesService) {}

  @Post()
  create(@Body() createPartyFeeDto: CreatePartyFeeDto) {
    return this.partyFeesService.create(createPartyFeeDto);
  }

  @Get()
  findAll() {
    return this.partyFeesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partyFeesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePartyFeeDto: UpdatePartyFeeDto) {
    return this.partyFeesService.update(+id, updatePartyFeeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.partyFeesService.remove(+id);
  }
}
