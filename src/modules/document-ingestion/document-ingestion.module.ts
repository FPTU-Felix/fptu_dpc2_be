import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentVersionEntity } from '@/modules/upload-documents/entities/document-version.entity';
import { DocumentChunkEntity } from '@/modules/upload-documents/entities/document-chunk.entity';
import { DocumentEntity } from '@/modules/upload-documents/entities/document.entity';
import { EmbeddingModule } from '@/modules/embedding/embedding.module';
import { DocumentParserService } from './services/document-parser.service';
import { DocumentChunkerService } from './services/document-chunker.service';
import { DocumentIngestionService } from './services/document-ingestion.service';
import { DocumentIngestionProcessor } from './queue/document-ingestion.processor';
import { documentQueueProviders } from './queue/document-ingestion.queue.providers';

@Module({
  imports: [
    ConfigModule,
    EmbeddingModule,
    TypeOrmModule.forFeature([
      DocumentVersionEntity,
      DocumentChunkEntity,
      DocumentEntity,
    ]),
  ],
  providers: [
    DocumentParserService,
    DocumentChunkerService,
    DocumentIngestionService,
    DocumentIngestionProcessor,
    ...documentQueueProviders,
  ],
  exports: [DocumentIngestionService, 'DOCUMENT_QUEUE_TOKEN'],
})
export class DocumentIngestionModule {}