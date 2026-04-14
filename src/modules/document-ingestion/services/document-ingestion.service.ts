import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Readable } from 'stream';

import { DocumentChunkEntity } from '@/modules/upload-documents/entities/document-chunk.entity';
import { DocumentAiKnowledge } from '@/modules/upload-documents/entities/document-ai-knowledge.entity';
import { DocumentParserService } from './document-parser.service';
import { DocumentChunkerService } from './document-chunker.service';
import { EmbeddingService } from '@/modules/embedding/services/embedding.service';
import { FileService } from '@/modules/file/file.service';

@Injectable()
export class DocumentIngestionService {
  private readonly logger = new Logger(DocumentIngestionService.name);
  private readonly expectedEmbeddingDim = 768;

  constructor(
    @InjectRepository(DocumentChunkEntity)
    private readonly documentChunkRepository: Repository<DocumentChunkEntity>,

    @InjectRepository(DocumentAiKnowledge)
    private readonly documentRepository: Repository<DocumentAiKnowledge>,

    private readonly parserService: DocumentParserService,
    private readonly chunkerService: DocumentChunkerService,
    private readonly embeddingService: EmbeddingService,
    private readonly dataSource: DataSource,
    private readonly fileService: FileService,
  ) {}

  async ingestDocument(documentAiKnowledgeId: string): Promise<void> {
    this.logger.log(
      `ingestDocument called. documentAiKnowledgeId=${documentAiKnowledgeId}`,
    );

    if (!documentAiKnowledgeId) {
      throw new BadRequestException('documentAiKnowledgeId is required');
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentAiKnowledgeId },
    });

    if (!document) {
      throw new NotFoundException(
        `DocumentAiKnowledge not found: ${documentAiKnowledgeId}`,
      );
    }

    if (!document.objectName?.trim()) {
      throw new BadRequestException(
        `objectName is missing on DocumentAiKnowledge: ${documentAiKnowledgeId}`,
      );
    }

    try {
      this.logger.debug(
        `Downloading file from MinIO. objectName=${document.objectName}`,
      );

      const file = await this.downloadMinioObjectFromFileService(
        document.objectName,
        document.fileName,
        document.mimeType,
      );

      const parsed = await this.parserService.extractText(file);

      this.logger.debug(
        `parsed.text.length=${parsed.text?.length ?? 0}, preview=${(parsed.text ?? '').slice(0, 1000)}`,
      );

      await this.deleteOldChunks(document.id);

      const chunks = this.chunkerService.chunkText({
        text: parsed.text,
        pageMap: parsed.pageMap,
        documentTitle: document.title,
        maxWords: 180,
        overlapWords: 20,
      });

      this.logger.debug(
        `chunks.length=${chunks.length}, chunks=${JSON.stringify(
          chunks.map((c) => ({
            chunkIndex: c.chunkIndex,
            sectionPath: c.sectionPath,
            tokenCount: c.tokenCount,
            content: c.content,
          })),
          null,
          2,
        )}`,
      );

      const savedChunks = await this.documentChunkRepository.save(
        chunks.map((chunk) =>
          this.documentChunkRepository.create({
            documentId: document.id,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            pageNumber: chunk.pageNumber,
            sectionPath: chunk.sectionPath,
            tokenCount: chunk.tokenCount,
            metadata: {
              ...(chunk.metadata ?? {}),
              documentAiKnowledgeId: document.id,
              sourceFileUrl: document.fileUrl,
              objectName: document.objectName,
              fileName: document.fileName,
              mimeType: document.mimeType,
              bucket: document.bucket,
            },
          }),
        ),
      );

      await this.embedAndUpdateChunks(savedChunks, document.title);

      this.logger.log(
        `Ingestion completed. documentAiKnowledgeId=${document.id}, chunks=${savedChunks.length}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Ingestion failed for documentAiKnowledgeId=${documentAiKnowledgeId}: ${error?.message}`,
      );
      this.logger.error(error?.stack);
      throw error;
    }
  }

  private async deleteOldChunks(documentAiKnowledgeId: string): Promise<void> {
    this.logger.debug(
      `Deleting old chunks by documentId=${documentAiKnowledgeId}`,
    );

    await this.documentChunkRepository.delete({
      documentId: documentAiKnowledgeId,
    });
  }

  private buildEmbeddingInput(
    chunk: Pick<DocumentChunkEntity, 'content' | 'sectionPath' | 'metadata'>,
    documentTitle: string,
  ): string {
    const kind = chunk.metadata?.kind
      ? `Loại nội dung: ${chunk.metadata.kind}`
      : '';
    const section = chunk.sectionPath ? `Mục: ${chunk.sectionPath}` : '';

    return [
      `Tài liệu: ${documentTitle}`,
      section,
      kind,
      `Nội dung: ${chunk.content}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async embedAndUpdateChunks(
    chunks: DocumentChunkEntity[],
    documentTitle: string,
  ) {
    const batchSize = 32;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((item) =>
        this.buildEmbeddingInput(item, documentTitle),
      );

      const vectors = await this.embeddingService.embedTexts(texts);

      const actualDim = vectors[0]?.length ?? 0;
      this.logger.debug(
        `Updating embeddings for ${batch.length} chunks, vectorDim=${actualDim}`,
      );

      if (actualDim !== this.expectedEmbeddingDim) {
        throw new InternalServerErrorException(
          `Embedding dimension mismatch: expected ${this.expectedEmbeddingDim}, got ${actualDim}`,
        );
      }

      await Promise.all(
        batch.map((chunk, index) =>
          this.dataSource.query(
            `
            UPDATE document_chunks
            SET embedding = $1::vector
            WHERE id = $2
            `,
            [JSON.stringify(vectors[index]), chunk.id],
          ),
        ),
      );
    }
  }

  private async downloadMinioObjectFromFileService(
    objectName: string,
    fileName?: string,
    mimeType?: string,
  ): Promise<Express.Multer.File> {
    const stream = await this.fileService.getFileStream(objectName);
    const buffer = await this.streamToBuffer(stream as Readable);
    const resolvedFileName =
      fileName?.trim() || this.guessFileNameFromObjectName(objectName);

    return {
      fieldname: 'file',
      originalname: resolvedFileName,
      encoding: '7bit',
      mimetype: mimeType || this.guessMimeType(resolvedFileName),
      size: buffer.length,
      buffer,
      stream: Readable.from(buffer),
      destination: '',
      filename: resolvedFileName,
      path: '',
    } as Express.Multer.File;
  }

  private guessFileNameFromObjectName(objectName: string): string {
    const parts = objectName.split('/');
    return parts[parts.length - 1] || 'document';
  }

  private guessMimeType(fileName: string): string {
    const lower = fileName.toLowerCase();

    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.doc')) return 'application/msword';
    if (lower.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (lower.endsWith('.txt')) return 'text/plain';
    if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';

    return 'application/octet-stream';
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }
}