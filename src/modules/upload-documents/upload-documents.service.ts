import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Queue } from 'bullmq';

import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentAiKnowledge } from './entities/document-ai-knowledge.entity';
import { DOCUMENT_JOB_NAMES } from './constants/document-queue.constant';
import { DOCUMENT_QUEUE_TOKEN } from '../document-ingestion/queue/document-ingestion.queue.providers';

@Injectable()
export class UploadDocumentsService {
  private readonly logger = new Logger(UploadDocumentsService.name);

  constructor(
    @InjectRepository(DocumentAiKnowledge)
    private readonly documentRepo: Repository<DocumentAiKnowledge>,

    private readonly dataSource: DataSource,

    @Inject(DOCUMENT_QUEUE_TOKEN)
    private readonly documentQueue: Queue,
  ) {}

  async createAndQueue(dto: UploadDocumentDto, adminUserId: string | null) {
    const context = 'createAndQueue';

    if (!dto?.title?.trim()) {
      throw new BadRequestException('Title is required');
    }

    if (!dto?.fileUrl?.trim()) {
      throw new BadRequestException('fileUrl is required');
    }

    if (!dto?.objectName?.trim()) {
      throw new BadRequestException('objectName is required');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const document = queryRunner.manager.create(DocumentAiKnowledge, {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        fileUrl: dto.fileUrl.trim(),
        objectName: dto.objectName.trim(),
        bucket: dto.bucket?.trim(),
        fileName: dto.fileName?.trim(),
        mimeType: dto.mimeType?.trim(),
        createdBy: adminUserId ?? undefined,
      });

      const saved = await queryRunner.manager.save(document);

      await queryRunner.commitTransaction();

      const job = await this.documentQueue.add(
        DOCUMENT_JOB_NAMES.INGEST_DOCUMENT,
        {
          documentAiKnowledgeId: saved.id,
          objectName: saved.objectName,
          fileUrl: saved.fileUrl,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      return {
        message: 'Created & queued',
        data: saved,
        queue: {
          jobId: job.id,
        },
      };
    } catch (error) {
      await this.safeRollback(queryRunner);
      this.logOriginalError(context, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        this.getErrorMessage(error, 'Create document AI knowledge failed'),
      );
    } finally {
      await queryRunner.release();
    }
  }

  async getPage(params: { page?: number; limit?: number }) {
    const context = 'getPage';

    try {
      const page = Math.max(Number(params.page) || 1, 1);
      const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 100);
      const skip = (page - 1) * limit;

      const [items, total] = await this.documentRepo.findAndCount({
        order: {
          createdAt: 'DESC',
        },
        skip,
        take: limit,
      });

      const mapped = items.map((item) => this.mapPreview(item));

      return {
        data: mapped,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logOriginalError(context, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        this.getErrorMessage(error, 'Get document AI knowledge page failed'),
      );
    }
  }

  async getById(id: string) {
    const context = 'getById';

    try {
      const item = await this.documentRepo.findOne({
        where: {
          id,
        },
      });

      if (!item) {
        throw new NotFoundException('Document not found');
      }

      return this.mapPreview(item);
    } catch (error) {
      this.logOriginalError(context, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        this.getErrorMessage(error, 'Get document AI knowledge detail failed'),
      );
    }
  }

  private mapPreview(doc: DocumentAiKnowledge) {
    try {
      const ext = doc.fileName?.split('.').pop()?.toLowerCase();

      let previewUrl = doc.fileUrl;

      const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
      const isOffice = officeExts.includes(ext || '');

      if (doc.fileUrl && isOffice) {
        previewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
          doc.fileUrl,
        )}&embedded=true`;
      }

      return {
        ...doc,
        previewUrl,
        isPreviewable: ext === 'pdf' || isOffice,
      };
    } catch (error) {
      this.logOriginalError('mapPreview', error);
      throw error;
    }
  }

  private async safeRollback(queryRunner: {
    rollbackTransaction: () => Promise<void>;
  }) {
    try {
      await queryRunner.rollbackTransaction();
    } catch (rollbackError) {
      this.logOriginalError('rollbackTransaction', rollbackError);
    }
  }

  private logOriginalError(context: string, error: unknown) {
    const anyError = error as any;

    const payload = {
      context,
      name: anyError?.name,
      message: anyError?.message,
      code: anyError?.code,
      detail: anyError?.detail,
      table: anyError?.table,
      column: anyError?.column,
      constraint: anyError?.constraint,
      query: anyError?.query,
      parameters: anyError?.parameters,
    };

    this.logger.error(
      `[${context}] Original error: ${JSON.stringify(payload, null, 2)}`,
      anyError?.stack,
    );
  }

  private getErrorMessage(error: unknown, fallback: string) {
    const anyError = error as any;

    return anyError?.message || fallback;
  }
}