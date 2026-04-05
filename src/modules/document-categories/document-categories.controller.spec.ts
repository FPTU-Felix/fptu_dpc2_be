import { Test, TestingModule } from '@nestjs/testing';
import { DocumentCategoriesController } from './document-categories.controller';
import { DocumentCategoriesService } from './document-categories.service';

describe('DocumentCategoriesController', () => {
  let controller: DocumentCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentCategoriesController],
      providers: [DocumentCategoriesService],
    }).compile();

    controller = module.get<DocumentCategoriesController>(DocumentCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
