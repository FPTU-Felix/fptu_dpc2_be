import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { UploadDocumentsController } from './upload-documents.controller';
import { UploadDocumentsService } from './upload-documents.service';
import { DocumentEntity } from './entities/document.entity';
import { DocumentVersionEntity } from './entities/document-version.entity';
import { DocumentChunkEntity } from './entities/document-chunk.entity';
import { DocumentIngestionModule } from '@/modules/document-ingestion/document-ingestion.module';
import { DocumentStorageService } from './services/document-storage.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      DocumentEntity,
      DocumentVersionEntity,
      DocumentChunkEntity,
    ]),
    DocumentIngestionModule,
  ],
  controllers: [UploadDocumentsController],
  providers: [UploadDocumentsService, DocumentStorageService],
  exports: [UploadDocumentsService],
})
export class UploadDocumentsModule {}



