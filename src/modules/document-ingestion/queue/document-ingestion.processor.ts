import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';

import { DocumentIngestionService } from '../services/document-ingestion.service';
import { DOCUMENT_JOB_NAMES } from 'src/modules/upload-documents/constants/document-queue.constant';

@Injectable()
export class DocumentIngestionProcessor {
  private readonly logger = new Logger(DocumentIngestionProcessor.name);

  constructor(
    private readonly documentIngestionService: DocumentIngestionService,
  ) {}

  async handle(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.name} - ${job.id}`);
    this.logger.debug(`Job data: ${JSON.stringify(job.data)}`);

    try {
      switch (job.name) {
        case DOCUMENT_JOB_NAMES.INGEST_DOCUMENT: {
          const documentAiKnowledgeId = job.data?.documentAiKnowledgeId;

          if (!documentAiKnowledgeId) {
            throw new UnrecoverableError(
              'documentAiKnowledgeId is missing in job data',
            );
          }

          await this.documentIngestionService.ingestDocument(
            documentAiKnowledgeId,
          );

          this.logger.log(`Completed job ${job.name} - ${job.id}`);
          return;
        }

        default:
          throw new Error(`Unsupported job name: ${job.name}`);
      }
    } catch (error: any) {
      this.logger.error(`Job failed: ${error?.message}`);
      this.logger.error(error?.stack);

      if (
        error instanceof ServiceUnavailableException &&
        String(error.message).includes('quota')
      ) {
        throw new UnrecoverableError(error.message);
      }

      throw error;
    }
  }
}
