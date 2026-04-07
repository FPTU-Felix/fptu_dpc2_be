import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { MinioService } from './minio.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly minioService: MinioService) { }

  private normalizeObjectKey(rawKey: string): string {
    let objectKey = decodeURIComponent(rawKey).replace(/^\/+/, '');

    // bỏ prefix route view nếu còn dính
    objectKey = objectKey.replace(/^view\//, '');

    // bỏ bucket name nếu dữ liệu cũ lưu sai kèm bucket
    objectKey = objectKey.replace(/^party-documents\//, '');

    return objectKey;
  }

  @Get('view/*')
  @Header('Cache-Control', 'public, max-age=31536000')
  async viewFile(@Req() req: Request, @Res() res: Response) {
    try {
      const rawKey = req.path.replace(/^\/documents\/view\//, '');
      const objectKey = this.normalizeObjectKey(rawKey);

      console.log('rawKey =', rawKey);
      console.log('normalized objectKey =', objectKey);

      const [stat, stream] = await Promise.all([
        this.minioService.statFile(objectKey),
        this.minioService.getFileStream(objectKey),
      ]);

      const fileName = objectKey.split('/').pop() || 'file';
      const ext = fileName.split('.').pop()?.toLowerCase();

      let contentType =
        stat.metaData?.['content-type'] ||
        stat.metaData?.['Content-Type'] ||
        'application/octet-stream';

      if (contentType === 'application/octet-stream') {
        if (ext === 'pdf') contentType = 'application/pdf';
        else if (ext === 'png') contentType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        else if (ext === 'webp') contentType = 'image/webp';
        else if (ext === 'txt') contentType = 'text/plain; charset=utf-8';
        else if (ext === 'doc') contentType = 'application/msword';
        else if (ext === 'docx') {
          contentType =
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

      if (stat.size) {
        res.setHeader('Content-Length', stat.size.toString());
      }

      stream.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Lỗi khi đọc file' });
        }
      });

      stream.pipe(res);

      res.on('close', () => {
        stream.destroy();
      });
    } catch (error) {
      console.error('View file error:', error);
      throw new NotFoundException('Không tìm thấy file');
    }
  }
}