import { Test, TestingModule } from '@nestjs/testing';
import { AiKnowledgeController } from './ai-knowledge.controller';
import { AiKnowledgeService } from './ai-knowledge.service';

describe('AiKnowledgeController', () => {
  let controller: AiKnowledgeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiKnowledgeController],
      providers: [AiKnowledgeService],
    }).compile();

    controller = module.get<AiKnowledgeController>(AiKnowledgeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
