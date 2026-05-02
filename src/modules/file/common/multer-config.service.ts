import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterOptionsFactory } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import multer from 'multer';
import { ALLOW_MIME_TYPES } from './constant';

@Injectable()
export class MulterConfigService implements MulterOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createMulterOptions(): MulterOptions {
    return {
      fileFilter: (req: Express.Request, file, callback) => {
        const isAllowed = ALLOW_MIME_TYPES.data.some(
          (t) => t.type === file.mimetype,
        );

        if (!isAllowed) {
          return callback(
            new BadRequestException({
              message: 'error-file-invalid-mimetype',
              mime: file.mimetype,
            }),
            false,
          );
        }

        callback(null, true);
      },
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 200 * 1024 * 1024, // Giới hạn 200MB
      },
    };
  }
}
