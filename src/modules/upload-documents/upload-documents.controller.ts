import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import { UploadDocumentDto } from './dto/upload-document.dto';
import { ApiTags } from '@nestjs/swagger';
import { UploadDocumentsService } from './upload-documents.service';

@ApiTags('ai-knowledge-document')
@Controller('upload-documents-ai-knowledge')
export class UploadDocumentsController {
  constructor(
    private readonly uploadDocumentsService: UploadDocumentsService,
  ) {}

  @Post('admin')
  async createAndQueueDocument(
    @Body() dto: UploadDocumentDto,
    @Req() req: any,
  ) {
    try {
      const adminUserId = req?.user?.sub ?? null;

      return await this.uploadDocumentsService.createAndQueue(
        dto,
        adminUserId,
      );
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      throw new InternalServerErrorException({
        message: 'Create document AI knowledge failed',
        error: error?.message ?? 'Unknown error',
      });
    }
  }

  @Get('admin/page')
  async getPage(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    try {
      return await this.uploadDocumentsService.getPage({
        page,
        limit,
      });
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      throw new InternalServerErrorException({
        message: 'Get document AI knowledge page failed',
        error: error?.message ?? 'Unknown error',
      });
    }
  }

  @Get(':id')
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    try {
      const item = await this.uploadDocumentsService.getById(id);

      return {
        data: item,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      throw new InternalServerErrorException({
        message: 'Get document AI knowledge failed',
        error: error?.message ?? 'Unknown error',
      });
    }
  }
}