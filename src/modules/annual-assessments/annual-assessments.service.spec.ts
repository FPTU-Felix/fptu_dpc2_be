import { Test, TestingModule } from '@nestjs/testing';
import { AnnualAssessmentsService } from './annual-assessments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnnualAssessment } from './entities/annual-assessment.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { Discipline } from '../disciplines/entities/discipline.entity';
import { EvaluationConfig } from './entities/evaluation-config.entity';
import { User } from '../users/entities/user.entity';
import { MinioService } from '../minio/minio.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Repository, Between } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentRank, AssessmentStatus } from 'src/common/enums';

// Mock thư viện phân trang
jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn().mockResolvedValue({
    items: [],
    meta: {
      totalItems: 0,
      itemCount: 0,
      itemsPerPage: 10,
      totalPages: 0,
      currentPage: 1,
    },
  }),
  Pagination: jest.fn().mockImplementation((items, meta) => ({ items, meta })),
}));

describe('AnnualAssessmentsService', () => {
  let service: AnnualAssessmentsService;
  let assessmentRepo: Repository<AnnualAssessment>;
  let configRepo: Repository<EvaluationConfig>;
  let minioService: MinioService;
  let notiService: NotificationsService;
  let pmRepo: Repository<PartyMember>;
  let disRepo: Repository<Discipline>;
  let userRepo: Repository<User>;

  const mockMember = {
    id: 'm-1',
    userId: 'u-1',
    fullName: 'Nguyễn Văn A',
    partyCellId: 'cell-1',
  };
  const mockAssessment = {
    id: 'a-1',
    memberId: 'm-1',
    year: 2026,
    status: AssessmentStatus.PENDING,
  };

  // Factory tạo Mock Repository
  const mockQb = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
  };

  const repositoryMockFactory = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((val) => Promise.resolve({ id: 'uuid', ...val })),
    createQueryBuilder: jest.fn(() => mockQb),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnualAssessmentsService,
        {
          provide: getRepositoryToken(AnnualAssessment),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(PartyMember),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(Discipline),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(EvaluationConfig),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(User),
          useFactory: repositoryMockFactory,
        },
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest
              .fn()
              .mockResolvedValue({ objectName: 'path/to/file' }),
          },
        },
        {
          provide: NotificationsService,
          useValue: { createInternal: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AnnualAssessmentsService>(AnnualAssessmentsService);
    assessmentRepo = module.get(getRepositoryToken(AnnualAssessment));
    configRepo = module.get(getRepositoryToken(EvaluationConfig));
    minioService = module.get<MinioService>(MinioService);
    notiService = module.get<NotificationsService>(NotificationsService);
    pmRepo = module.get(getRepositoryToken(PartyMember));
    disRepo = module.get(getRepositoryToken(Discipline));
    userRepo = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================
  // 1. EVALUATION CONFIG
  // =========================================================
  describe('upsertEvaluationConfig', () => {
    it('nên tạo config mới nếu chưa tồn tại', async () => {
      (pmRepo.createQueryBuilder().getOne as jest.Mock).mockResolvedValue({
        id: 'cell-1',
      });
      (configRepo.findOne as jest.Mock).mockResolvedValue(null);

      await service.upsertEvaluationConfig('cell-1', 2026, ['Tiêu chí 1']);
      expect(configRepo.create).toHaveBeenCalled();
      expect(configRepo.save).toHaveBeenCalled();
    });

    it('nên báo lỗi nếu Chi bộ không tồn tại', async () => {
      (pmRepo.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.upsertEvaluationConfig('invalid', 2026, []),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================
  // 2. SUBMIT ASSESSMENT
  // =========================================================
  describe('submitAssessment', () => {
    const dto = {
      year: 2026,
      selfRank: AssessmentRank.EXCELLENT,
      remarks: 'Tốt',
      file: undefined,
    };

    it('nên báo lỗi nếu Đảng viên bị kỷ luật mà đòi xếp loại Xuất sắc', async () => {
      (pmRepo.findOne as jest.Mock).mockResolvedValue(mockMember);
      (assessmentRepo.findOne as jest.Mock).mockResolvedValue(null);
      (disRepo.findOne as jest.Mock).mockResolvedValue({ id: 'dis-1' }); // Có kỷ luật

      await expect(service.submitAssessment('u-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên nộp thành công và gọi Minio nếu có đính kèm file', async () => {
      const mockFile = { originalname: 'test.pdf' } as any;

      (pmRepo.findOne as jest.Mock).mockResolvedValue(mockMember);
      (assessmentRepo.findOne as jest.Mock).mockResolvedValue(null);
      (disRepo.findOne as jest.Mock).mockResolvedValue(null); // Không kỷ luật

      await service.submitAssessment('u-1', dto, mockFile);

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(assessmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentFileUrl: 'path/to/file',
        }),
      );
    });
  });

  // =========================================================
  // 3. REVIEW ASSESSMENT
  // =========================================================
  describe('reviewAssessment', () => {
    const reviewDto = {
      status: AssessmentStatus.APPROVED,
      finalRank: AssessmentRank.GOOD,
      score: 95,
      criteriaChecklist: [],
    };

    it('nên duyệt thành công và gửi thông báo cho Đảng viên', async () => {
      (assessmentRepo.findOne as jest.Mock).mockResolvedValue(mockAssessment);
      (pmRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockMember,
        user: { id: 'u-1', email: 'a@g.com' },
      });

      await service.reviewAssessment('a-1', 'reviewer-1', reviewDto);

      expect(assessmentRepo.save).toHaveBeenCalled();
      expect(notiService.createInternal).toHaveBeenCalled();
    });

    it('nên chặn nếu bản đánh giá đã được xử lý trước đó', async () => {
      (assessmentRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockAssessment,
        status: AssessmentStatus.APPROVED,
      });

      await expect(
        service.reviewAssessment('a-1', 'rev', reviewDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================
  // 4. FIND ALL (Pagination)
  // =========================================================
  describe('findAll', () => {
    it('nên gọi hàm paginate với các tham số filter', async () => {
      await service.findAll(
        { page: 1, limit: 10 },
        2026,
        AssessmentStatus.PENDING,
      );

      const qb = assessmentRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalledWith('a.year = :year', {
        year: 2026,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('a.status = :status', {
        status: AssessmentStatus.PENDING,
      });
    });
  });

  // =========================================================
  // 5. GET MY ASSESSMENT
  // =========================================================
  describe('getMyAssessmentByYear', () => {
    it('nên trả về bản đánh giá nếu tìm thấy', async () => {
      (pmRepo.findOne as jest.Mock).mockResolvedValue(mockMember);
      (assessmentRepo.findOne as jest.Mock).mockResolvedValue(mockAssessment);

      const result = await service.getMyAssessmentByYear('u-1', 2026);
      expect(result).toEqual(mockAssessment);
    });

    it('nên báo lỗi NotFound nếu chưa nộp', async () => {
      (pmRepo.findOne as jest.Mock).mockResolvedValue(mockMember);
      (assessmentRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getMyAssessmentByYear('u-1', 2026)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
