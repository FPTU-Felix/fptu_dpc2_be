import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { generateSafeFileName } from 'src/common/utils/file.util';

@Injectable()
export class FileService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;
  private publicUrl: string;
  private serverAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('minio.endPoint')!,
      port: Number(this.configService.get<number>('minio.port')!),
      useSSL: this.configService.get<boolean>('minio.useSSL')!,
      accessKey: this.configService.get<string>('minio.accessKey')!,
      secretKey: this.configService.get<string>('minio.secretKey')!,
    });

    this.bucket = this.configService.get<string>('minio.bucket')!;
    this.publicUrl = this.configService.get<string>('minio.publicUrl')!;
    this.serverAddress =
      this.configService.get<string>('server.address', { infer: true }) ||
      'http://160.25.81.143:3000';
  }

  async onModuleInit() {
    const exists = await this.client
      .bucketExists(this.bucket)
      .catch(() => false);

    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
    }
  }

  async uploadFile(params: { file: Express.Multer.File; scope?: string }) {
    try {
      const { file, scope } = params;

      if (!file) {
        throw new BadRequestException('File is required');
      }

      const safeFileName = generateSafeFileName(file.originalname);
      const objectName = scope
        ? `${scope.toLowerCase()}/${Date.now()}_${safeFileName}`
        : `${Date.now()}_${safeFileName}`;

      await this.client.putObject(
        this.bucket,
        objectName,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
        },
      );

      return {
        bucket: this.bucket,
        objectName,
        fileName: file.originalname,
        safeFileName,
        mimeType: file.mimetype,
        size: file.size,
        url: `${this.publicUrl}/${this.bucket}/${objectName}`,
        viewUrl: `${this.serverAddress}/file/view?objectName=${encodeURIComponent(
          objectName,
        )}`,
        openUrl: `${this.serverAddress}/file/open?objectName=${encodeURIComponent(
          objectName,
        )}`,
        presignedUrlApi: `${this.serverAddress}/file/presigned-url?objectName=${encodeURIComponent(
          objectName,
        )}`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Upload file lên MinIO thất bại');
    }
  }

  async deleteFile(objectName: string) {
    try {
      await this.client.removeObject(this.bucket, objectName);
      return true;
    } catch {
      throw new InternalServerErrorException('Xóa file trên MinIO thất bại');
    }
  }

  async getPresignedUrl(objectName: string, expiry = 60 * 60) {
    try {
      return await this.client.presignedGetObject(
        this.bucket,
        objectName,
        expiry,
      );
    } catch {
      throw new InternalServerErrorException('Tạo presigned URL thất bại');
    }
  }

  async statFile(objectName: string) {
    try {
      return await this.client.statObject(this.bucket, objectName);
    } catch {
      throw new InternalServerErrorException('Không lấy được thông tin file');
    }
  }

  async getFileStream(objectName: string) {
    try {
      return await this.client.getObject(this.bucket, objectName);
    } catch {
      throw new InternalServerErrorException('Không lấy được file từ MinIO');
    }
  }
}
