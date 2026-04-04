import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, UseInterceptors, UploadedFile, ParseUUIDPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetCurrentUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Documents - Quản lý tài liệu')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Tải lên tài liệu mới' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @GetCurrentUser('sub') userId: string,
  ) {
    return this.documentsService.create(createDocumentDto, file, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả tài liệu' })
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết tài liệu' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài liệu' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.remove(id);
  }
}