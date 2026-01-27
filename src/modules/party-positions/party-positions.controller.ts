import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PartyPositionsService } from './party-positions.service';
import { CreatePartyPositionDto } from './dto/create-party-position.dto';
import { UpdatePartyPositionDto } from './dto/update-party-position.dto';

@Controller('party-positions')
export class PartyPositionsController {
  constructor(private readonly partyPositionsService: PartyPositionsService) {}

  @Post()
  create(@Body() createPartyPositionDto: CreatePartyPositionDto) {
    return this.partyPositionsService.create(createPartyPositionDto);
  }

  @Get()
  findAll() {
    return this.partyPositionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partyPositionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePartyPositionDto: UpdatePartyPositionDto) {
    return this.partyPositionsService.update(+id, updatePartyPositionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.partyPositionsService.remove(+id);
  }
}
