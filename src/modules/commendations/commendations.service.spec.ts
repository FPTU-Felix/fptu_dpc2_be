import { Test, TestingModule } from '@nestjs/testing';
import { CommendationsService } from './commendations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Commendation } from './entities/commendation.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

describe('CommendationsService', () => {
  let service: CommendationsService;
  let commendationRepo: Repository<Commendation>;
  let partyMemberRepo: Repository<PartyMember>;

  const mockMemberId = 'member-uuid';
  const mockCreatorId = 'admin-uuid';

  // FIX: Đầy đủ các thuộc tính theo CreateCommendationDto
  const mockCreateDto = {
    memberId: mockMemberId,
    title: 'Đảng viên xuất sắc tiêu biểu',
    date: '2026-11-20', // Để string theo @IsDateString()
    decisionNumber: '456/QĐ-ĐU',
    signingAuthority: 'Đảng ủy Khối Doanh nghiệp',
    description: 'Có thành tích xuất sắc trong học tập và làm theo tư tưởng đạo đức Hồ Chí Minh',
    decisionFileUrl: 'https://example.com/quyet-dinh.pdf',
  };

  // FIX: Đầy đủ thuộc tính theo Entity Commendation
  const mockCommendation = {
    id: 'uuid-1',
    ...mockCreateDto,
    createdBy: mockCreatorId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCommendationRepo = {
    create: jest.fn().mockReturnValue(mockCommendation),
    save: jest.fn().mockResolvedValue(mockCommendation),
    find: jest.fn().mockResolvedValue([mockCommendation]),
  };

  const mockPartyMemberRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommendationsService,
        { provide: getRepositoryToken(Commendation), useValue: mockCommendationRepo },
        { provide: getRepositoryToken(PartyMember), useValue: mockPartyMemberRepo },
      ],
    }).compile();

    service = module.get<CommendationsService>(CommendationsService);
    commendationRepo = module.get<Repository<Commendation>>(getRepositoryToken(Commendation));
    partyMemberRepo = module.get<Repository<PartyMember>>(getRepositoryToken(PartyMember));
  });

  afterEach(() => jest.clearAllMocks());

  // --- 1. CREATE ---
  describe('create', () => {
    it('nên tạo khen thưởng thành công khi tìm thấy Đảng viên', async () => {
      mockPartyMemberRepo.findOne.mockResolvedValue({ id: mockMemberId });

      const result = await service.create(mockCreatorId, mockCreateDto);

      expect(partyMemberRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockCreateDto.memberId },
      });
      expect(commendationRepo.create).toHaveBeenCalledWith({
        ...mockCreateDto,
        createdBy: mockCreatorId,
      });
      expect(commendationRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockCommendation);
    });

    it('nên ném lỗi NotFoundException nếu không tìm thấy Đảng viên', async () => {
      mockPartyMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.create(mockCreatorId, mockCreateDto))
        .rejects.toThrow(NotFoundException);
      
      expect(commendationRepo.save).not.toHaveBeenCalled();
    });
  });

  // --- 2. FIND BY MEMBER ---
  describe('findByMember', () => {
    it('nên trả về danh sách khen thưởng sắp xếp mới nhất', async () => {
      const result = await service.findByMember(mockMemberId);

      expect(commendationRepo.find).toHaveBeenCalledWith({
        where: { memberId: mockMemberId },
        order: { date: 'DESC' },
      });
      expect(result).toEqual([mockCommendation]);
    });
  });
});