import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { UploadDocumentsController } from './upload-documents.controller';
import { UploadDocumentsService } from './upload-documents.service';
import { DocumentChunkEntity } from './entities/document-chunk.entity';
import { DocumentAiKnowledge } from './entities/document-ai-knowledge.entity';
import { DocumentIngestionModule } from '../document-ingestion/document-ingestion.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([DocumentChunkEntity, DocumentAiKnowledge]),
    DocumentIngestionModule,
  ],
  controllers: [UploadDocumentsController],
  providers: [UploadDocumentsService],
  exports: [UploadDocumentsService],
})
export class UploadDocumentsModule {}
