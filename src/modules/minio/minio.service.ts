import { Injectable, InternalServerErrorException, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Minio from "minio";
import { randomUUID } from "crypto";
import * as path from "path";

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.configService.get<string>("minio.endPoint")!,
      port: this.configService.get<number>("minio.port")!,
      useSSL: this.configService.get<boolean>("minio.useSSL")!,
      accessKey: this.configService.get<string>("minio.accessKey")!,
      secretKey: this.configService.get<string>("minio.secretKey")!,
    });

    this.bucket = this.configService.get<string>("minio.bucket")!;
    this.publicUrl = this.configService.get<string>("minio.publicUrl")!;
  }

  async onModuleInit() {
    const exists = await this.client.bucketExists(this.bucket).catch(() => false);

    if (!exists) {
      await this.client.makeBucket(this.bucket, "us-east-1");
    }
  }

  async uploadFile(params: {
    file: Express.Multer.File;
    folder?: string;
    fileName?: string;
    metadata?: Record<string, string>;
  }) {
    try {
      const { file, folder, fileName, metadata } = params;

      const ext = path.extname(file.originalname);
      const safeFileName = fileName || `${randomUUID()}${ext}`;
      const objectName = folder ? `${folder}/${safeFileName}` : safeFileName;

      await this.client.putObject(
        this.bucket,
        objectName,
        file.buffer,
        file.size,
        {
          "Content-Type": file.mimetype,
          ...metadata,
        },
      );

      return {
        bucket: this.bucket,
        objectName,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `${this.publicUrl}/${this.bucket}/${objectName}`,
      };
    } catch (error) {
      throw new InternalServerErrorException("Upload file lên MinIO thất bại");
    }
  }

  async deleteFile(objectName: string) {
    try {
      await this.client.removeObject(this.bucket, objectName);
      return true;
    } catch (error) {
      throw new InternalServerErrorException("Xóa file trên MinIO thất bại");
    }
  }

  async getPresignedUrl(objectName: string, expiry = 60 * 60) {
    try {
      const url = await this.client.presignedGetObject(
        this.bucket,
        objectName,
        expiry,
      );

      return url;
    } catch (error) {
      throw new InternalServerErrorException("Tạo presigned URL thất bại");
    }
  }

  async statFile(objectName: string) {
    try {
      return await this.client.statObject(this.bucket, objectName);
    } catch (error) {
      throw new InternalServerErrorException("Không lấy được thông tin file");
    }
  }

  async getFileStream(objectName: string) {
    return this.client.getObject(this.bucket, objectName);
  }
}