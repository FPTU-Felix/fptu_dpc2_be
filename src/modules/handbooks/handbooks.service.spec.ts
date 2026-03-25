import { Test, TestingModule } from '@nestjs/testing';
import { HandbooksService } from './handbooks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Handbook } from './entities/handbook.entity';
import { HandbookLink } from './entities/handbook-link.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { paginate } from 'nestjs-typeorm-paginate';

// Mock thư viện phân trang
jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

describe('HandbooksService', () => {
  let service: HandbooksService;
  let handbookRepo: Repository<Handbook>;
  let linkRepo: Repository<HandbookLink>;

  const mockHandbookId = 'hb-123';
  const mockLinkId = 'link-456';

  const mockHandbook = { id: mockHandbookId, title: 'Sổ tay' };
  const mockLink = { id: mockLinkId, title: 'Tài liệu' };

  // 1. Tạo một đối tượng Mock QueryBuilder cố định để theo dõi các lời gọi hàm
  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  };

  const mockRepositoryFactory = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    // Luôn trả về đối tượng mockQueryBuilder duy nhất ở trên
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandbooksService,
        { provide: getRepositoryToken(Handbook), useValue: mockRepositoryFactory() },
        { provide: getRepositoryToken(HandbookLink), useValue: mockRepositoryFactory() },
      ],
    }).compile();

    service = module.get<HandbooksService>(HandbooksService);
    handbookRepo = module.get<Repository<Handbook>>(getRepositoryToken(Handbook));
    linkRepo = module.get<Repository<HandbookLink>>(getRepositoryToken(HandbookLink));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. HANDBOOK BRANCHES
  // ==========================================
  describe('findAll', () => {
    it('nên gọi .where() khi isActiveOnly = true', async () => {
      await service.findAll({ page: 1, limit: 10 }, true);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'handbook.isActive = :isActive',
        { isActive: true },
      );
    });

    it('không nên gọi .where() khi isActiveOnly = false', async () => {
      await service.findAll({ page: 1, limit: 10 }, false);
      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('thành công: trả về handbook', async () => {
      (handbookRepo.findOne as jest.Mock).mockResolvedValue(mockHandbook);
      expect(await service.findOne(mockHandbookId)).toEqual(mockHandbook);
    });

    it('thất bại: ném lỗi NotFoundException', async () => {
      (handbookRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create/update/remove Handbook', () => {
    it('create: nên lưu bản ghi mới', async () => {
      (handbookRepo.create as jest.Mock).mockReturnValue(mockHandbook);
      await service.create({ title: 'New' } as any);
      expect(handbookRepo.save).toHaveBeenCalled();
    });

    it('update: thành công cập nhật dữ liệu', async () => {
      (handbookRepo.findOne as jest.Mock).mockResolvedValue(mockHandbook);
      await service.update(mockHandbookId, { title: 'Update' });
      expect(handbookRepo.save).toHaveBeenCalled();
    });

    it('remove: thành công xóa bản ghi', async () => {
      (handbookRepo.findOne as jest.Mock).mockResolvedValue(mockHandbook);
      const result = await service.remove(mockHandbookId);
      expect(handbookRepo.remove).toHaveBeenCalled();
      expect(result.message).toContain('thành công');
    });
  });

  // ==========================================
  // 2. HANDBOOK LINKS BRANCHES
  // ==========================================
  describe('addLink', () => {
    it('thành công: tạo link mới cho handbook tồn tại', async () => {
      (handbookRepo.findOne as jest.Mock).mockResolvedValue(mockHandbook);
      (linkRepo.create as jest.Mock).mockReturnValue(mockLink);
      await service.addLink(mockHandbookId, { title: 'T', url: 'http://u' });
      expect(linkRepo.save).toHaveBeenCalled();
    });

    it('thất bại: ném lỗi nếu handbook cha không tồn tại', async () => {
      (handbookRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.addLink('id', { title: 'T', url: 'http://u' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLink', () => {
    it('thành công: cập nhật link', async () => {
      (linkRepo.findOne as jest.Mock).mockResolvedValue(mockLink);
      await service.updateLink(mockLinkId, { title: 'New' });
      expect(linkRepo.save).toHaveBeenCalled();
    });

    it('thất bại: ném lỗi NotFound nếu sai linkId', async () => {
      (linkRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.updateLink('bad-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeLink', () => {
    it('thành công: xóa link', async () => {
      (linkRepo.findOne as jest.Mock).mockResolvedValue(mockLink);
      await service.removeLink(mockLinkId);
      expect(linkRepo.remove).toHaveBeenCalled();
    });

    it('thất bại: ném lỗi NotFound khi xóa link không tồn tại', async () => {
      (linkRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.removeLink('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});