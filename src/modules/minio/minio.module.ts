import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioService } from './minio.service';
import { DocumentsController } from './documents.controller';
@Global()
@Module({
  imports: [ConfigModule],
  providers: [MinioService],
  exports: [MinioService],
  controllers: [DocumentsController],
})
export class MinioModule {}
