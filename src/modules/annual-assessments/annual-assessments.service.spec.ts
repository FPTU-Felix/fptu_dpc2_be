import { Test, TestingModule } from '@nestjs/testing';
import { AnnualAssessmentsService } from './annual-assessments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnnualAssessment } from './entities/annual-assessment.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { Discipline } from '../disciplines/entities/discipline.entity';
import { Repository, Like } from 'typeorm';
import { 
  BadRequestException, 
  ConflictException, 
  NotFoundException 
} from '@nestjs/common';
import { AssessmentRank, AssessmentStatus } from 'src/common/enums';

describe('AnnualAssessmentsService', () => {
  let service: AnnualAssessmentsService;
  let assessmentRepo: Repository<AnnualAssessment>;
  let partyMemberRepo: Repository<PartyMember>;
  let disciplineRepo: Repository<Discipline>;

  // --- Mock Data Setup ---
  const mockUserId = 'user-uuid';
  const mockMemberId = 'member-uuid';
  const mockAssessmentId = 'assessment-uuid';
  const mockReviewerId = 'reviewer-uuid';

  const mockCreateDto = {
    year: 2026,
    selfRank: AssessmentRank.GOOD,
    remarks: 'Hoàn thành tốt nhiệm vụ',
    assessmentFileUrl: 'https://storage.com/file.pdf',
  };

  const mockReviewDto = {
    status: AssessmentStatus.APPROVED,
    finalRank: AssessmentRank.EXCELLENT,
  };

  // --- Mock Repositories ---
  const mockAssessmentRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((val) => Promise.resolve({ id: mockAssessmentId, ...val })),
  };

  const mockPartyMemberRepo = {
    findOne: jest.fn(),
  };

  const mockDisciplineRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnualAssessmentsService,
        { provide: getRepositoryToken(AnnualAssessment), useValue: mockAssessmentRepo },
        { provide: getRepositoryToken(PartyMember), useValue: mockPartyMemberRepo },
        { provide: getRepositoryToken(Discipline), useValue: mockDisciplineRepo },      ],
    }).compile();

    service = module.get<AnnualAssessmentsService>(AnnualAssessmentsService);
    assessmentRepo = module.get<Repository<AnnualAssessment>>(getRepositoryToken(AnnualAssessment));
    partyMemberRepo = module.get<Repository<PartyMember>>(getRepositoryToken(PartyMember));
    disciplineRepo = module.get<Repository<Discipline>>(getRepositoryToken(Discipline));
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================
  // 1. SUBMIT ASSESSMENT (Nộp bản tự đánh giá)
  // =========================================================
  describe('submitAssessment', () => {
    it('nên nộp thành công khi dữ liệu hợp lệ (Rank GOOD)', async () => {
      mockPartyMemberRepo.findOne.mockResolvedValue({ id: mockMemberId });
      mockAssessmentRepo.findOne.mockResolvedValue(null);

      const result = await service.submitAssessment(mockUserId, mockCreateDto);

      expect(result.status).toBe(AssessmentStatus.PENDING);
      expect(mockAssessmentRepo.save).toHaveBeenCalled();
    });

    it('nên ném lỗi NotFound nếu user chưa có hồ sơ Đảng viên', async () => {
      mockPartyMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.submitAssessment(mockUserId, mockCreateDto))
        .rejects.toThrow(NotFoundException);
    });

    it('nên ném lỗi Conflict nếu đã nộp đánh giá cho năm đó rồi', async () => {
      mockPartyMemberRepo.findOne.mockResolvedValue({ id: mockMemberId });
      mockAssessmentRepo.findOne.mockResolvedValue({ id: 'existing-id' });

      await expect(service.submitAssessment(mockUserId, mockCreateDto))
        .rejects.toThrow(ConflictException);
    });

    it('nên chặn tự xếp loại EXCELLENT nếu dính kỷ luật trong năm', async () => {
      mockPartyMemberRepo.findOne.mockResolvedValue({ id: mockMemberId });
      mockAssessmentRepo.findOne.mockResolvedValue(null);
      mockDisciplineRepo.findOne.mockResolvedValue({ id: 'dis-id' }); // Có kỷ luật

      const excellentDto = { ...mockCreateDto, selfRank: AssessmentRank.EXCELLENT };

      await expect(service.submitAssessment(mockUserId, excellentDto))
        .rejects.toThrow(BadRequestException);
      
      expect(disciplineRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { memberId: mockMemberId, date: Like('2026-%') }
      }));
    });

    it('nên cho phép EXCELLENT nếu không có kỷ luật', async () => {
      mockPartyMemberRepo.findOne.mockResolvedValue({ id: mockMemberId });
      mockAssessmentRepo.findOne.mockResolvedValue(null);
      mockDisciplineRepo.findOne.mockResolvedValue(null); // Không kỷ luật

      const excellentDto = { ...mockCreateDto, selfRank: AssessmentRank.EXCELLENT };
      const result = await service.submitAssessment(mockUserId, excellentDto);

      expect(result.selfRank).toBe(AssessmentRank.EXCELLENT);
    });
  });

  // =========================================================
  // 2. REVIEW ASSESSMENT (Chi ủy duyệt đánh giá)
  // =========================================================
  describe('reviewAssessment', () => {
    it('nên duyệt thành công (APPROVED)', async () => {
      mockAssessmentRepo.findOne.mockResolvedValue({
        id: mockAssessmentId,
        memberId: mockMemberId,
        year: 2026,
        status: AssessmentStatus.PENDING,
      });

      const result = await service.reviewAssessment(mockAssessmentId, mockReviewerId, {
        status: AssessmentStatus.APPROVED,
        finalRank: AssessmentRank.GOOD
      });

      expect(result.status).toBe(AssessmentStatus.APPROVED);
      expect(result.reviewerId).toBe(mockReviewerId);
      expect(result.reviewedAt).toBeDefined();
    });

    it('nên ném lỗi NotFound nếu bản đánh giá không tồn tại', async () => {
      mockAssessmentRepo.findOne.mockResolvedValue(null);

      await expect(service.reviewAssessment(mockAssessmentId, mockReviewerId, mockReviewDto))
        .rejects.toThrow(NotFoundException);
    });

    it('nên ném lỗi BadRequest nếu bản đánh giá đã được duyệt trước đó (không còn PENDING)', async () => {
      mockAssessmentRepo.findOne.mockResolvedValue({
        id: mockAssessmentId,
        status: AssessmentStatus.APPROVED, // Đã duyệt
      });

      await expect(service.reviewAssessment(mockAssessmentId, mockReviewerId, mockReviewDto))
        .rejects.toThrow(BadRequestException);
    });

    it('nên chặn Chi ủy chốt EXCELLENT nếu Đảng viên có kỷ luật', async () => {
      mockAssessmentRepo.findOne.mockResolvedValue({
        id: mockAssessmentId,
        memberId: mockMemberId,
        year: 2026,
        status: AssessmentStatus.PENDING,
      });
      mockDisciplineRepo.findOne.mockResolvedValue({ id: 'discipline-id' }); // Có kỷ luật

      await expect(service.reviewAssessment(mockAssessmentId, mockReviewerId, mockReviewDto))
        .rejects.toThrow(BadRequestException);
    });
  });
});