import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioService } from './minio.service';
import { DocumentsController } from './documents.controller';
import { FileController } from './file.controller';
@Global()
@Module({
  imports: [ConfigModule],
  providers: [MinioService],
  exports: [MinioService],
  controllers: [DocumentsController, FileController],
})
export class MinioModule {}
