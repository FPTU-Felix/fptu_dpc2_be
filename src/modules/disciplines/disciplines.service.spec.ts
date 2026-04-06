import { Test, TestingModule } from '@nestjs/testing';
import { DisciplinesService } from './disciplines.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Discipline } from './entities/discipline.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { MinioService } from '../minio/minio.service';
import * as nestjsTypeormPaginate from 'nestjs-typeorm-paginate';

// Mock module phân trang
jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

describe('DisciplinesService', () => {
  let service: DisciplinesService;
  let disciplineRepo: Repository<Discipline>;
  let partyMemberRepo: Repository<PartyMember>;
  let minioService: MinioService;

  const mockMemberId = 'member-uuid';
  const mockCreatorId = 'admin-uuid';
  const mockDisciplineId = 'discipline-uuid';

  const mockCreateDto = {
    memberId: mockMemberId,
    reason: 'Vi phạm quy định điều lệ',
    date: '2026-04-06',
    decisionNumber: '456/QD-KL',
    form: 'Khiển trách',
    description: 'Vi phạm lần đầu',
  };

  const mockDiscipline = {
    id: mockDisciplineId,
    ...mockCreateDto,
    decisionFileUrl: 'disciplines/2026/file.pdf',
    createdBy: mockCreatorId,
  };

  const mockFile = {
    originalname: 'discipline.pdf',
    buffer: Buffer.from('test-buffer'),
  } as Express.Multer.File;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisciplinesService,
        {
          provide: getRepositoryToken(Discipline),
          useValue: {
            create: jest.fn().mockReturnValue(mockDiscipline),
            save: jest.fn().mockResolvedValue(mockDiscipline),
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
            uploadFile: jest.fn().mockResolvedValue({ objectName: 'disciplines/2026/uploaded.pdf' }),
          },
        },
      ],
    }).compile();

    service = module.get<DisciplinesService>(DisciplinesService);
    disciplineRepo = module.get<Repository<Discipline>>(getRepositoryToken(Discipline));
    partyMemberRepo = module.get<Repository<PartyMember>>(getRepositoryToken(PartyMember));
    minioService = module.get<MinioService>(MinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- CREATE METHOD ---
  describe('create', () => {
    it(' nên tạo kỷ luật thành công với file đính kèm', async () => {
      (partyMemberRepo.findOne as jest.Mock).mockResolvedValue({ id: mockMemberId });

      const result = await service.create(mockCreatorId, mockCreateDto, mockFile);

      expect(minioService.uploadFile).toHaveBeenCalledWith(expect.objectContaining({
        folder: expect.stringContaining('disciplines/'),
      }));
      expect(disciplineRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        decisionFileUrl: 'disciplines/2026/uploaded.pdf',
        createdBy: mockCreatorId,
      }));
      expect(result).toEqual(mockDiscipline);
    });

    it(' nên tạo kỷ luật thành công khi KHÔNG có file (file là optional)', async () => {
      (partyMemberRepo.findOne as jest.Mock).mockResolvedValue({ id: mockMemberId });

      await service.create(mockCreatorId, mockCreateDto, null);

      expect(minioService.uploadFile).not.toHaveBeenCalled();
      expect(disciplineRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        decisionFileUrl: undefined,
      }));
    });

    it(' nên ném lỗi NotFoundException nếu Đảng viên không tồn tại', async () => {
      (partyMemberRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.create(mockCreatorId, mockCreateDto))
        .rejects.toThrow(NotFoundException);
    });

    it(' nên ném lỗi nếu upload file MinIO thất bại', async () => {
      (partyMemberRepo.findOne as jest.Mock).mockResolvedValue({ id: mockMemberId });
      (minioService.uploadFile as jest.Mock).mockRejectedValue(new Error('Upload Failed'));

      await expect(service.create(mockCreatorId, mockCreateDto, mockFile))
        .rejects.toThrow('Upload Failed');
    });
  });

  // --- UPDATE METHOD ---
  describe('update', () => {
    it(' nên cập nhật kỷ luật và thay file mới', async () => {
      (disciplineRepo.findOne as jest.Mock).mockResolvedValue({ ...mockDiscipline });
      
      const updateDto = { form: 'Cảnh cáo' };
      const result = await service.update(mockDisciplineId, updateDto, mockFile);

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(disciplineRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        form: 'Cảnh cáo',
        decisionFileUrl: 'disciplines/2026/uploaded.pdf',
      }));
      expect(result).toEqual(mockDiscipline);
    });

    it(' nên giữ lại URL file cũ nếu không truyền file mới', async () => {
      const oldUrl = 'disciplines/old_file.pdf';
      (disciplineRepo.findOne as jest.Mock).mockResolvedValue({ ...mockDiscipline, decisionFileUrl: oldUrl });

      await service.update(mockDisciplineId, { reason: 'Lý do mới' }, null);

      expect(minioService.uploadFile).not.toHaveBeenCalled();
      expect(disciplineRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        decisionFileUrl: oldUrl,
      }));
    });

    it(' nên ném lỗi nếu không tìm thấy bản ghi kỷ luật', async () => {
      (disciplineRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(mockDisciplineId, {}))
        .rejects.toThrow(NotFoundException);
    });
  });

  // --- FIND BY MEMBER METHOD ---
  describe('findByMember', () => {
    it(' nên trả về danh sách kỷ luật sắp xếp giảm dần', async () => {
      (disciplineRepo.find as jest.Mock).mockResolvedValue([mockDiscipline]);

      const result = await service.findByMember(mockMemberId);

      expect(disciplineRepo.find).toHaveBeenCalledWith({
        where: { memberId: mockMemberId },
        order: { date: 'DESC' },
      });
      expect(result).toEqual([mockDiscipline]);
    });

    it(' trả về mảng rỗng nếu Đảng viên "tốt", không bị kỷ luật', async () => {
      (disciplineRepo.find as jest.Mock).mockResolvedValue([]);
      const result = await service.findByMember(mockMemberId);
      expect(result).toEqual([]);
    });
  });

  // --- FIND ALL METHOD ---
  describe('findAll', () => {
    it(' nên thực hiện QueryBuilder với đầy đủ filter và join', async () => {
      const options = { page: 1, limit: 10 };
      const year = 2026;
      
      await service.findAll(options, year, mockMemberId);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('YEAR(d.date) = :year', { year });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.memberId = :memberId', { memberId: mockMemberId });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('d.date', 'DESC');
      expect(nestjsTypeormPaginate.paginate).toHaveBeenCalledWith(mockQueryBuilder, options);
    });

    it(' nên bỏ qua các điều kiện where nếu không có filter', async () => {
      await service.findAll({ page: 1, limit: 10 });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });
});