import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CommendationsService } from './commendations.service';
import { CreateCommendationDto } from './dto/create-commendation.dto';
import { UpdateCommendationDto } from './dto/update-commendation.dto';

@Controller('commendations')
export class CommendationsController {
  constructor(private readonly commendationsService: CommendationsService) {}

  @Post()
  create(@Body() createCommendationDto: CreateCommendationDto) {
    return this.commendationsService.create(createCommendationDto);
  }

  @Get()
  findAll() {
    return this.commendationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commendationsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommendationDto: UpdateCommendationDto) {
    return this.commendationsService.update(+id, updateCommendationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commendationsService.remove(+id);
  }
}
