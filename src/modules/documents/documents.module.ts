import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from './entities/document.entity'; // Import Entity Document của bạn
import { MinioModule } from '../minio/minio.module'; // Đảm bảo có cái này để dùng MinioService

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    
    MinioModule, 
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}