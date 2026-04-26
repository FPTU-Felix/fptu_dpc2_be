import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { UploadDocumentDto } from './dto/upload-document.dto';

import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { UploadDocumentsService } from './upload-documents.service';

@ApiTags('ai-knowledge-document')
@Controller('upload-documents-ai-knowledge')
export class UploadDocumentsController {
  private readonly logger = new Logger(UploadDocumentsController.name);

  constructor(
    private readonly uploadDocumentsService: UploadDocumentsService,
  ) {}

  @Post('admin')
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles('ADMIN')
  async createAndQueueDocument(
    @Body() dto: UploadDocumentDto,
    @Req() req: any,
  ) {
    try {
      const adminUserId = req?.user?.sub ?? null;
      const result = await this.uploadDocumentsService.createAndQueue(
        dto,
        adminUserId,
      );

      return result;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Create document AI knowledge failed',
        error: error?.message ?? 'Unknown error',
      });
    }
  }

  @Get(':id')
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles('ADMIN')
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    try {
      const item = await this.uploadDocumentsService.getById(id);

      return {
        data: item,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Get document AI knowledge failed',
        error: error?.message ?? 'Unknown error',
      });
    }
  }
}
