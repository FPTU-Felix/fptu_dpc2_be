import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    this.client = new OpenAI({ apiKey });
    this.model =
      this.configService.get<string>('EMBEDDING_MODEL') ||
      'text-embedding-3-small';
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    const normalizedTexts = texts
      .map((t) => t?.trim())
      .filter((t): t is string => Boolean(t));

    if (!normalizedTexts.length) return [];

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: normalizedTexts,
      });

      return response.data.map((item) => item.embedding);
    } catch (error: any) {
      this.logger.error('Create embeddings failed');
      this.logger.error(`message: ${error?.message}`);
      this.logger.error(`status: ${error?.status}`);
      this.logger.error(`code: ${error?.code}`);
      this.logger.error(`type: ${error?.type}`);

      if (error?.code === 'insufficient_quota') {
        throw new ServiceUnavailableException(
          'Embedding provider quota exceeded',
        );
      }

      throw new InternalServerErrorException(
        error?.message || 'Create embeddings failed',
      );
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    const vectors = await this.embedTexts([text]);
    return vectors[0];
  }
}