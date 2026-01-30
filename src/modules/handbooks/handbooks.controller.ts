import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HandbooksService } from './handbooks.service';
import { CreateHandbookDto } from './dto/create-handbook.dto';
import { UpdateHandbookDto } from './dto/update-handbook.dto';

@Controller('handbooks')
export class HandbooksController {
  constructor(private readonly handbooksService: HandbooksService) {}

  @Post()
  create(@Body() createHandbookDto: CreateHandbookDto) {
    return this.handbooksService.create(createHandbookDto);
  }

  @Get()
  findAll() {
    return this.handbooksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.handbooksService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHandbookDto: UpdateHandbookDto) {
    return this.handbooksService.update(+id, updateHandbookDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.handbooksService.remove(+id);
  }
}
