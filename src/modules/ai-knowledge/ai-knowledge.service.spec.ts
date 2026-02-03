import { Test, TestingModule } from '@nestjs/testing';
import { AiKnowledgeService } from './ai-knowledge.service';

describe('AiKnowledgeService', () => {
  let service: AiKnowledgeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiKnowledgeService],
    }).compile();

    service = module.get<AiKnowledgeService>(AiKnowledgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
