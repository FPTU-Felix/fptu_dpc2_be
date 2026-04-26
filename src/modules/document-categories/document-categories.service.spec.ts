import { Test, TestingModule } from '@nestjs/testing';
import { DocumentCategoriesService } from './document-categories.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentCategory } from './entities/document-category.entity';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('DocumentCategoriesService', () => {
  let service: DocumentCategoriesService;
  let repo: Repository<DocumentCategory>;

  const mockId = '550e8400-e29b-41d4-a716-446655440000'; // Mock UUID

  const mockCategory = {
    id: mockId,
    name: 'Nghị quyết',
    slug: 'nghi-quyet',
    description: 'Các văn bản nghị quyết',
    sortOrder: 1,
    documents: [],
  } as DocumentCategory;

  const mockCreateDto = {
    name: 'Nghị quyết',
    slug: 'nghi-quyet',
    sortOrder: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentCategoriesService,
        {
          provide: getRepositoryToken(DocumentCategory),
          useValue: {
            create: jest.fn().mockReturnValue(mockCategory),
            save: jest.fn().mockResolvedValue(mockCategory),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentCategoriesService>(DocumentCategoriesService);
    repo = module.get<Repository<DocumentCategory>>(
      getRepositoryToken(DocumentCategory),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- CREATE ---
  describe('create', () => {
    it(' nên tạo danh mục thành công khi slug chưa tồn tại', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null); // Không tìm thấy trùng slug

      const result = await service.create(mockCreateDto);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { slug: mockCreateDto.slug },
      });
      expect(repo.create).toHaveBeenCalledWith(mockCreateDto);
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(mockCategory);
    });

    it(' nên ném lỗi ConflictException nếu slug đã tồn tại', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockCategory); // Giả lập đã có slug này

      await expect(service.create(mockCreateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // --- FIND ALL ---
  describe('findAll', () => {
    it(' nên trả về danh sách danh mục được sắp xếp', async () => {
      const mockList = [mockCategory];
      (repo.find as jest.Mock).mockResolvedValue(mockList);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        relations: ['documents'],
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
      });
      expect(result).toEqual(mockList);
    });

    it(' trả về mảng rỗng nếu không có danh mục nào', async () => {
      (repo.find as jest.Mock).mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  // --- FIND ONE ---
  describe('findOne', () => {
    it(' nên trả về danh mục nếu ID tồn tại', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockCategory);

      const result = await service.findOne(mockId);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: mockId },
        relations: ['documents'],
      });
      expect(result).toEqual(mockCategory);
    });

    it(' nên ném lỗi NotFoundException nếu ID không tồn tại', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(mockId)).rejects.toThrow(NotFoundException);
    });
  });

  // --- UPDATE ---
  describe('update', () => {
    it(' nên cập nhật thành công khi không đổi slug', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockCategory);

      const updateDto = { name: 'Tên mới' };
      const result = await service.update(mockId, updateDto);

      expect(repo.save).toHaveBeenCalled();
      expect(result.name).toBe('Tên mới');
    });

    it(' nên cập nhật thành công khi đổi sang slug mới chưa tồn tại', async () => {
      (repo.findOne as jest.Mock)
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(null);

      const updateDto = { slug: 'slug-moi' };
      const result = await service.update(mockId, updateDto);

      expect(repo.save).toHaveBeenCalled();
      expect(result.slug).toBe('slug-moi');
    });

    it(' nên ném lỗi ConflictException nếu đổi sang slug đã bị dùng bởi record khác', async () => {
      (repo.findOne as jest.Mock)
        .mockResolvedValueOnce(mockCategory) // Record hiện tại
        .mockResolvedValueOnce({ id: 'other-id', slug: 'slug-trung' }); // Slug mới bị trùng

      await expect(
        service.update(mockId, { slug: 'slug-trung' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // --- REMOVE ---
  describe('remove', () => {
    it(' nên xóa danh mục thành công', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockCategory);
      (repo.remove as jest.Mock).mockResolvedValue(mockCategory);

      const result = await service.remove(mockId);

      expect(repo.remove).toHaveBeenCalledWith(mockCategory);
      expect(result.message).toContain('thành công');
    });

    it(' nên thất bại nếu không tìm thấy danh mục để xóa', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(mockId)).rejects.toThrow(NotFoundException);
    });
  });
});
