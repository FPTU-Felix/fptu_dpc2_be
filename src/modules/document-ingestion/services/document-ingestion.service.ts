import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

import {
  DocumentVersionEntity,
  DocumentVersionStatus,
} from '@/modules/upload-documents/entities/document-version.entity';
import { DocumentChunkEntity } from '@/modules/upload-documents/entities/document-chunk.entity';
import { DocumentEntity } from '@/modules/upload-documents/entities/document.entity';
import { DocumentParserService } from './document-parser.service';
import { DocumentChunkerService } from './document-chunker.service';
import { EmbeddingService } from '@/modules/embedding/services/embedding.service';

@Injectable()
export class DocumentIngestionService {
  private readonly logger = new Logger(DocumentIngestionService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(DocumentVersionEntity)
    private readonly documentVersionRepository: Repository<DocumentVersionEntity>,

    @InjectRepository(DocumentChunkEntity)
    private readonly documentChunkRepository: Repository<DocumentChunkEntity>,

    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,

    private readonly parserService: DocumentParserService,
    private readonly chunkerService: DocumentChunkerService,
    private readonly embeddingService: EmbeddingService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || '';
    this.s3 = new S3Client({
      region: this.configService.get<string>('AWS_REGION') || '',
      credentials:
        this.configService.get<string>('AWS_ACCESS_KEY_ID') &&
        this.configService.get<string>('AWS_SECRET_ACCESS_KEY')
          ? {
              accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
              secretAccessKey:
                this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
            }
          : undefined,
    });
  }

  async ingestDocumentVersion(documentVersionId: string): Promise<void> {
    const version = await this.documentVersionRepository.findOne({
      where: { id: documentVersionId },
    });

    if (!version) {
      throw new Error(`Document version not found: ${documentVersionId}`);
    }

    await this.documentVersionRepository.update(version.id, {
      ingestionStatus: DocumentVersionStatus.PROCESSING,
      errorMessage: null,
    });

    try {
      if (!version.fileKey) {
        throw new Error('fileKey is missing on document version');
      }

      const document = await this.documentRepository.findOne({
        where: { id: version.documentId },
      });

      if (!document) {
        throw new Error(`Document not found: ${version.documentId}`);
      }

      const file = await this.downloadS3Object(
        version.fileKey,
        version.fileName,
        version.fileType,
      );

      const parsed = await this.parserService.extractText(file);

      await this.documentChunkRepository.delete({
        documentVersionId: version.id,
      });

      const chunks = this.chunkerService.chunkText({
        text: parsed.text,
        pageMap: parsed.pageMap,
        documentTitle: document.title,
        maxWords: 220,
        overlapWords: 30,
      });

      const savedChunks = await this.documentChunkRepository.save(
        chunks.map((chunk) =>
          this.documentChunkRepository.create({
            documentVersionId: version.id,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            pageNumber: chunk.pageNumber,
            sectionPath: chunk.sectionPath,
            tokenCount: chunk.tokenCount,
            metadata: chunk.metadata ?? {},
          }),
        ),
      );

      await this.embedAndUpdateChunks(savedChunks, document.title);

      await this.documentVersionRepository.update(version.id, {
        extractedText: parsed.text,
        ingestionStatus: DocumentVersionStatus.COMPLETED,
        errorMessage: null,
      });

      await this.documentRepository.update(version.documentId, {
        contentText: parsed.text,
      });

      this.logger.log(
        `Ingestion completed. versionId=${version.id}, chunks=${savedChunks.length}`,
      );
    } catch (error: any) {
      this.logger.error(error);

      await this.documentVersionRepository.update(version.id, {
        ingestionStatus: DocumentVersionStatus.FAILED,
        errorMessage: error?.message || 'Ingestion failed',
      });

      throw error;
    }
  }

  private buildEmbeddingInput(
    chunk: Pick<DocumentChunkEntity, 'content' | 'sectionPath' | 'metadata'>,
    documentTitle: string,
  ): string {
    const kind = chunk.metadata?.kind ? `Loại nội dung: ${chunk.metadata.kind}` : '';
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

  private async downloadS3Object(
    fileKey: string,
    fileName: string,
    mimeType?: string,
  ): Promise<Express.Multer.File> {
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      }),
    );

    const buffer = await this.streamToBuffer(response.Body as Readable);

    return {
      fieldname: 'file',
      originalname: fileName,
      encoding: '7bit',
      mimetype: mimeType || 'application/octet-stream',
      size: buffer.length,
      buffer,
      stream: Readable.from(buffer),
      destination: '',
      filename: fileName,
      path: '',
    } as Express.Multer.File;
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}