import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { UploadDocumentsController } from './upload-documents.controller';
import { UploadDocumentsService } from './upload-documents.service';
import { DocumentChunkEntity } from './entities/document-chunk.entity';
import { DocumentIngestionModule } from '@/modules/document-ingestion/document-ingestion.module';
import { DocumentAiKnowledge } from './entities/document-ai-knowledge.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
     
      DocumentChunkEntity,
      DocumentAiKnowledge
    ]),
    DocumentIngestionModule,
  ],
  controllers: [UploadDocumentsController],
  providers: [UploadDocumentsService],
  exports: [UploadDocumentsService],
})
export class UploadDocumentsModule {}



