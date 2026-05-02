import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentParserService } from './services/document-parser.service';
import { DocumentIngestionService } from './services/document-ingestion.service';
import { DocumentIngestionProcessor } from './queue/document-ingestion.processor';
import { documentQueueProviders } from './queue/document-ingestion.queue.providers';
import { DocumentAiKnowledge } from '../upload-documents/entities/document-ai-knowledge.entity';
import { FileModule } from '../file/file.module';
import { DocumentChunkerService } from './services/document-chunker.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { DocumentChunkEntity } from '../upload-documents/entities/document-chunk.entity';

@Module({
  imports: [
    ConfigModule,
    EmbeddingModule,
    TypeOrmModule.forFeature([DocumentChunkEntity, DocumentAiKnowledge]),
    FileModule,
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
