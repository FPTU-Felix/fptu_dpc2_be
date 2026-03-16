import { Test, TestingModule } from '@nestjs/testing';
import { PartyAdmissionsService } from './party-admissions.service';

describe('PartyAdmissionsService', () => {
  let service: PartyAdmissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PartyAdmissionsService],
    }).compile();

    service = module.get<PartyAdmissionsService>(PartyAdmissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
