import { Test, TestingModule } from '@nestjs/testing';
import { DocumentCategoriesService } from './document-categories.service';

describe('DocumentCategoriesService', () => {
  let service: DocumentCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentCategoriesService],
    }).compile();

    service = module.get<DocumentCategoriesService>(DocumentCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
