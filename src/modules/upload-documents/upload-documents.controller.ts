import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { UploadDocumentDto } from './dto/upload-document.dto';
import { UploadDocumentsService } from './upload-documents.service';

import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('upload-documents')
export class UploadDocumentsController {
  private readonly logger = new Logger(UploadDocumentsController.name);

  constructor(
    private readonly uploadDocumentsService: UploadDocumentsService,
  ) {}

  @Post('admin/upload')
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @Req() req: any,
  ) {
    try {
      this.logger.log('=== [UPLOAD DOCUMENT] START ===');
      this.logger.debug(`dto: ${JSON.stringify(dto)}`);
      this.logger.debug(
        `file: ${
          file
            ? JSON.stringify({
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
              })
            : 'undefined'
        }`,
      );
      this.logger.debug(`req.user: ${JSON.stringify(req?.user ?? null)}`);

      // Nếu đang tắt guard thì req.user có thể undefined
      const adminUserId = req?.user?.id ?? null;

      if (!adminUserId) {
        this.logger.warn(
          'req.user.id is missing. You are probably calling this route without JWT guard.',
        );
      }

      const result = await this.uploadDocumentsService.uploadAndQueue(
        file,
        dto,
        adminUserId,
      );

      this.logger.log('=== [UPLOAD DOCUMENT] SUCCESS ===');
      return result;
    } catch (error: any) {
      this.logger.error('=== [UPLOAD DOCUMENT] FAILED ===');
      this.logger.error(`message: ${error?.message}`);
      this.logger.error(`stack: ${error?.stack}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Upload document failed',
        error: error?.message ?? 'Unknown error',
      });
    }
  }

  @Get('versions/:documentVersionId/chunks')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async getChunks(
    @Param('documentVersionId', new ParseUUIDPipe())
    documentVersionId: string,
  ) {
    try {
      this.logger.log(
        `=== [GET DOCUMENT CHUNKS] versionId=${documentVersionId} ===`,
      );

      const items =
        await this.uploadDocumentsService.getDocumentChunks(documentVersionId);

      this.logger.log(
        `=== [GET DOCUMENT CHUNKS] SUCCESS count=${items.length} ===`,
      );

      return {
        documentVersionId,
        items,
      };
    } catch (error: any) {
      this.logger.error('=== [GET DOCUMENT CHUNKS] FAILED ===');
      this.logger.error(`message: ${error?.message}`);
      this.logger.error(`stack: ${error?.stack}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Get document chunks failed',
        error: error?.message ?? 'Unknown error',
      });
    }
  }
}