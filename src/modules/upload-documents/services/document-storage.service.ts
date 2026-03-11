import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class DocumentStorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || '';
    this.s3 = new S3Client({
      region: this.configService.get<string>('AWS_REGION') || '',
      credentials:
        this.configService.get<string>('AWS_ACCESS_KEY_ID') &&
        this.configService.get<string>('AWS_SECRET_ACCESS_KEY')
          ? {
              accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
              secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
            }
          : undefined,
    });
  }

  async uploadFile(params: {
    fileBuffer: Buffer;
    originalName: string;
    mimeType: string;
  }): Promise<{
    key: string;
    fileUrl: string;
    checksum: string;
  }> {
    try {
      const ext = path.extname(params.originalName);
      const checksum = crypto
        .createHash('sha256')
        .update(params.fileBuffer)
        .digest('hex');

      const fileKey = `documents/${new Date().getFullYear()}/${crypto.randomUUID()}${ext}`;

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: fileKey,
          Body: params.fileBuffer,
          ContentType: params.mimeType,
        }),
      );

      const region = this.configService.get<string>('AWS_REGION');
      const fileUrl = `https://${this.bucket}.s3.${region}.amazonaws.com/${fileKey}`;

      return {
        key: fileKey,
        fileUrl,
        checksum,
      };
    } catch (error) {
      throw new InternalServerErrorException('Upload file to S3 failed');
    }
  }
}