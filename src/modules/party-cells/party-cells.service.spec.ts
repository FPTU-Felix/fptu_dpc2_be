import { Test, TestingModule } from '@nestjs/testing';
import { PartyCellsService } from './party-cells.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PartyCell } from './entities/party-cell.entity';
import { Repository } from 'typeorm';

describe('PartyCellsService', () => {
  let service: PartyCellsService;
  let repo: Repository<PartyCell>;

  const mockPartyCells = [
    { id: 'uuid-1', name: 'Chi bộ A', code: 'CB01' },
    { id: 'uuid-2', name: 'Chi bộ B', code: 'CB02' },
  ];

  const mockRepo = {
    find: jest.fn().mockResolvedValue(mockPartyCells),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartyCellsService,
        {
          provide: getRepositoryToken(PartyCell),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<PartyCellsService>(PartyCellsService);
    repo = module.get<Repository<PartyCell>>(getRepositoryToken(PartyCell));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllForDropdown', () => {
    it('nên gọi repo.find với đúng các cột và sắp xếp theo tên ASC', async () => {
      const result = await service.findAllForDropdown();

      // Kiểm tra tham số truyền vào hàm find
      expect(repo.find).toHaveBeenCalledWith({
        select: ['id', 'name', 'code'],
        order: {
          name: 'ASC',
        },
      });

      // Kiểm tra kết quả trả về
      expect(result).toEqual(mockPartyCells);
      expect(result.length).toBe(2);
    });

    it('nên trả về mảng rỗng nếu không có Chi bộ nào trong DB', async () => {
      mockRepo.find.mockResolvedValueOnce([]);

      const result = await service.findAllForDropdown();

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });
});
