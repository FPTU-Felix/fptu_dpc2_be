import { Test, TestingModule } from '@nestjs/testing';
import { PartyAdmissionsController } from './party-admissions.controller';
import { PartyAdmissionsService } from './party-admissions.service';

describe('PartyAdmissionsController', () => {
  let controller: PartyAdmissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartyAdmissionsController],
      providers: [PartyAdmissionsService],
    }).compile();

    controller = module.get<PartyAdmissionsController>(PartyAdmissionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
