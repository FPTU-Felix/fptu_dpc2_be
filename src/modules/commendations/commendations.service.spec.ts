import { Test, TestingModule } from '@nestjs/testing';
import { CommendationsService } from './commendations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Commendation } from './entities/commendation.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { Repository } from 'typeorm';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { MinioService } from '../minio/minio.service';
import * as nestjsTypeormPaginate from 'nestjs-typeorm-paginate';

// Mock module nestjs-typeorm-paginate
jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

describe('CommendationsService', () => {
  let service: CommendationsService;
  let commendationRepo: Repository<Commendation>;
  let partyMemberRepo: Repository<PartyMember>;
  let minioService: MinioService;

  const mockMemberId = 'member-uuid';
  const mockCreatorId = 'admin-uuid';
  const mockCommendationId = 'commendation-uuid';

  const mockCreateDto = {
    memberId: mockMemberId,
    title: 'Đảng viên xuất sắc',
    date: '2026-04-06',
    decisionNumber: '123/QD',
    signingAuthority: 'Đảng ủy',
    description: 'Thành tích tốt',
  };

  const mockCommendation = {
    id: mockCommendationId,
    ...mockCreateDto,
    decisionFileUrl: 'path/to/file.pdf',
    createdBy: mockCreatorId,
  };

  const mockFile = {
    originalname: 'test.pdf',
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommendationsService,
        {
          provide: getRepositoryToken(Commendation),
          useValue: {
            create: jest.fn().mockReturnValue(mockCommendation),
            save: jest.fn().mockResolvedValue(mockCommendation),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(PartyMember),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue({ objectName: 'uploaded/path.pdf' }),
          },
        },
      ],
    }).compile();

    service = module.get<CommendationsService>(CommendationsService);
    commendationRepo = module.get<Repository<Commendation>>(getRepositoryToken(Commendation));
    partyMemberRepo = module.get<Repository<PartyMember>>(getRepositoryToken(PartyMember));
    minioService = module.get<MinioService>(MinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- CREATE ---
  describe('create', () => {
    it(' nên tạo khen thưởng thành công với file đính kèm', async () => {
      (partyMemberRepo.findOne as jest.Mock).mockResolvedValue({ id: mockMemberId });

      const result = await service.create(mockCreatorId, mockCreateDto, mockFile);

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(commendationRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        decisionFileUrl: 'uploaded/path.pdf',
        createdBy: mockCreatorId,
      }));
      expect(result).toEqual(mockCommendation);
    });

    it(' nên tạo khen thưởng thành công khi KHÔNG có file (file optional)', async () => {
      (partyMemberRepo.findOne as jest.Mock).mockResolvedValue({ id: mockMemberId });

      await service.create(mockCreatorId, mockCreateDto, null);

      expect(minioService.uploadFile).not.toHaveBeenCalled();
      expect(commendationRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        decisionFileUrl: undefined,
      }));
    });

    it(' nên ném lỗi NotFoundException nếu không tìm thấy Đảng viên', async () => {
      (partyMemberRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.create(mockCreatorId, mockCreateDto))
        .rejects.toThrow(NotFoundException);
    });

    it(' nên ném lỗi nếu MinioService bị sập', async () => {
      (partyMemberRepo.findOne as jest.Mock).mockResolvedValue({ id: mockMemberId });
      (minioService.uploadFile as jest.Mock).mockRejectedValue(new Error('MinIO Conn Error'));

      await expect(service.create(mockCreatorId, mockCreateDto, mockFile))
        .rejects.toThrow('MinIO Conn Error');
    });
  });

  // --- UPDATE ---
  describe('update', () => {
    it(' nên cập nhật thông tin và upload file mới', async () => {
      (commendationRepo.findOne as jest.Mock).mockResolvedValue({ ...mockCommendation });
      
      const updateDto = { title: 'Tiêu đề mới' };
      const result = await service.update(mockCommendationId, updateDto, mockFile);

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(commendationRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Tiêu đề mới',
        decisionFileUrl: 'uploaded/path.pdf',
      }));
      expect(result).toEqual(mockCommendation);
    });

    it(' nên giữ nguyên file cũ nếu không truyền file mới', async () => {
      const oldUrl = 'old/path.pdf';
      (commendationRepo.findOne as jest.Mock).mockResolvedValue({ ...mockCommendation, decisionFileUrl: oldUrl });

      await service.update(mockCommendationId, { title: 'Update Title' }, null);

      expect(minioService.uploadFile).not.toHaveBeenCalled();
      expect(commendationRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        decisionFileUrl: oldUrl,
      }));
    });

    it(' nên ném lỗi NotFoundException nếu bản ghi khen thưởng không tồn tại', async () => {
      (commendationRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(mockCommendationId, {}))
        .rejects.toThrow(NotFoundException);
    });
  });

  // --- FIND BY MEMBER ---
  describe('findByMember', () => {
    it(' nên trả về danh sách khen thưởng của một đảng viên', async () => {
      (commendationRepo.find as jest.Mock).mockResolvedValue([mockCommendation]);

      const result = await service.findByMember(mockMemberId);

      expect(commendationRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { memberId: mockMemberId },
      }));
      expect(result).toEqual([mockCommendation]);
    });

    it(' nên trả về mảng rỗng nếu không có dữ liệu', async () => {
      (commendationRepo.find as jest.Mock).mockResolvedValue([]);
      const result = await service.findByMember('none-id');
      expect(result).toEqual([]);
    });
  });

  // --- FIND ALL (PAGINATION & FILTERS) ---
  describe('findAll', () => {
    it(' nên gọi paginate với đầy đủ filter year và memberId', async () => {
      const options = { page: 1, limit: 10 };
      const year = 2026;
      
      await service.findAll(options, year, mockMemberId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('YEAR(c.date) = :year', { year });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('c.memberId = :memberId', { memberId: mockMemberId });
      expect(nestjsTypeormPaginate.paginate).toHaveBeenCalledWith(mockQueryBuilder, options);
    });

    it(' nên bỏ qua filter nếu không truyền year hoặc memberId', async () => {
      await service.findAll({ page: 1, limit: 10 });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it(' nên handle được tham số phân trang ở giá trị biên', async () => {
      const options = { page: 0, limit: 1000 }; // Page 0 thường được xử lý mặc định là 1
      await service.findAll(options);
      expect(nestjsTypeormPaginate.paginate).toHaveBeenCalledWith(mockQueryBuilder, options);
    });
  });
});