import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PartyCellsService } from './party-cells.service';
import { CreatePartyCellDto } from './dto/create-party-cell.dto';
import { UpdatePartyCellDto } from './dto/update-party-cell.dto';

@Controller('party-cells')
export class PartyCellsController {
  constructor(private readonly partyCellsService: PartyCellsService) {}

  @Post()
  create(@Body() createPartyCellDto: CreatePartyCellDto) {
    return this.partyCellsService.create(createPartyCellDto);
  }

  @Get()
  findAll() {
    return this.partyCellsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partyCellsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePartyCellDto: UpdatePartyCellDto) {
    return this.partyCellsService.update(+id, updatePartyCellDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.partyCellsService.remove(+id);
  }
}
