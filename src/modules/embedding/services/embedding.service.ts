import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type OllamaEmbedResponse = {
  model: string;
  embeddings: number[][];
};

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('OLLAMA_BASE_URL') ||
      'http://localhost:11434';

    this.model =
      this.configService.get<string>('OLLAMA_EMBEDDING_MODEL') ||
      'nomic-embed-text';
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    const normalizedTexts = texts
      .map((t) => t?.trim())
      .filter((t): t is string => Boolean(t));

    if (!normalizedTexts.length) return [];

    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: normalizedTexts,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Ollama embed failed: ${response.status} ${errorText}`);

        if (response.status >= 500) {
          throw new ServiceUnavailableException('Ollama embedding service unavailable');
        }

        throw new InternalServerErrorException(
          `Ollama embed failed: ${response.status}`,
        );
      }

      const data = (await response.json()) as OllamaEmbedResponse;

      if (!Array.isArray(data.embeddings)) {
        throw new InternalServerErrorException(
          'Invalid embeddings response from Ollama',
        );
      }

      return data.embeddings;
    } catch (error: any) {
      this.logger.error('Create embeddings failed');
      this.logger.error(`message: ${error?.message}`);

      if (error instanceof ServiceUnavailableException) {
        throw error;
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