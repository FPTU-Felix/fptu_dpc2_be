import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, UseInterceptors, UploadedFile, ParseUUIDPipe, Res
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetCurrentUser } from '../auth/decorators/get-user.decorator';
import { UpdateDocumentDto } from './dto/update-document.dto';

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
  @ApiOperation({ summary: 'Lấy tất cả tài liệu' })
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết tài liệu' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findOne(id);
  }

@Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tài liệu' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.documentsService.update(id, updateDocumentDto, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài liệu' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.remove(id);
  }
  @Get(':id/download')
  @ApiOperation({ summary: 'Tải xuống tài liệu' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { stream, fileName } = await this.documentsService.download(id);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURI(fileName)}"`,
    });

    return stream.pipe(res);
  }
}