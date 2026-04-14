import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentChunkEntity } from '@/modules/upload-documents/entities/document-chunk.entity';
import { EmbeddingModule } from '@/modules/embedding/embedding.module';
import { DocumentParserService } from './services/document-parser.service';
import { DocumentChunkerService } from './services/document-chunker.service';
import { DocumentIngestionService } from './services/document-ingestion.service';
import { DocumentIngestionProcessor } from './queue/document-ingestion.processor';
import { documentQueueProviders } from './queue/document-ingestion.queue.providers';
import { DocumentAiKnowledge } from '../upload-documents/entities/document-ai-knowledge.entity';
import { FileModule } from '../file/file.module';

@Module({
  imports: [
    ConfigModule,
    EmbeddingModule,
    TypeOrmModule.forFeature([
      DocumentChunkEntity,
      DocumentAiKnowledge
    ]),
    FileModule
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
export class DocumentIngestionModule { }