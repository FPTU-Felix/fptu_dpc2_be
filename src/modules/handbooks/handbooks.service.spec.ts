import { Test, TestingModule } from '@nestjs/testing';
import { HandbooksService } from './handbooks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HandbookCategory } from './entities/handbook-category.entity';
import { HandbookArticle, ArticleStatus } from './entities/handbook-article.entity';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { MinioService } from '../minio/minio.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as nestjsTypeormPaginate from 'nestjs-typeorm-paginate';

jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

describe('HandbooksService - Full Coverage Suite', () => {
  let service: HandbooksService;
  let categoryRepo: Repository<HandbookCategory>;
  let articleRepo: Repository<HandbookArticle>;
  let userRepo: Repository<User>;
  let minioService: MinioService;
  let notificationsService: NotificationsService;

  const mockCategory = { id: 'cat-1', name: 'Hướng dẫn', slug: 'huong-dan' };
  const mockArticle = { 
    id: 'art-1', title: 'Bài viết 1', slug: 'bai-viet-1', 
    status: ArticleStatus.PUBLISHED, viewCount: 0, thumbnailUrl: 'old.jpg',
    categoryId: 'cat-1'
  };

  const mockQueryBuilder: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    loadRelationCountAndMap: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandbooksService,
        {
          provide: getRepositoryToken(HandbookCategory),
          useValue: {
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn().mockImplementation(c => Promise.resolve({ id: 'new-cat', ...c })),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(HandbookArticle),
          useValue: {
            create: jest.fn().mockImplementation(dto => ({ ...mockArticle, ...dto })),
            save: jest.fn().mockImplementation(a => Promise.resolve(a)),
            findOne: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: { find: jest.fn().mockResolvedValue([{ id: 'u1', email: 'u@t.com' }]) },
        },
        {
          provide: MinioService,
          useValue: { uploadFile: jest.fn().mockResolvedValue({ objectName: 'new.jpg' }), deleteFile: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { createInternal: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get<HandbooksService>(HandbooksService);
    categoryRepo = module.get(getRepositoryToken(HandbookCategory));
    articleRepo = module.get(getRepositoryToken(HandbookArticle));
    userRepo = module.get(getRepositoryToken(User));
    minioService = module.get(MinioService);
    notificationsService = module.get(NotificationsService);
  });

  // =========================================================================
  // 🟢 ROLE 1: ĐẢNG VIÊN (READ ONLY)
  // =========================================================================

  describe('Đảng viên - Xem nội dung', () => {
    it(' getCategoriesForUser - trả về chuyên mục kèm đếm bài viết', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockCategory]);
      await service.getCategoriesForUser();
      expect(mockQueryBuilder.loadRelationCountAndMap).toHaveBeenCalled();
    });

    it(' getPublishedArticles - gọi paginate với các filter đúng', async () => {
      const filters = { search: 'Đảng', categoryId: 'cat-1' };
      await service.getPublishedArticles({ page: 1, limit: 10 }, filters);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), { search: '%Đảng%' });
      expect(nestjsTypeormPaginate.paginate).toHaveBeenCalled();
    });

    it(' getArticleBySlug - tìm thấy bài viết và tăng lượt xem', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValue({ ...mockArticle });
      const result = await service.getArticleBySlug('bai-viet-1');
      expect(result.viewCount).toBe(1);
      expect(articleRepo.save).toHaveBeenCalled();
    });

    it(' getArticleBySlug - ném lỗi nếu bài viết không tồn tại/bị ẩn', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.getArticleBySlug('unknown')).rejects.toThrow(NotFoundException);
    });

    it(' getRelatedArticles - lấy đúng 3 bài cùng chuyên mục (trừ bài hiện tại)', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValue(mockArticle);
      mockQueryBuilder.getMany.mockResolvedValue([{}, {}, {}]);
      const result = await service.getRelatedArticles('bai-viet-1');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(3);
      expect(result.length).toBe(3);
    });
  });

  // =========================================================================
  // 🔴 ROLE 2: ADMIN (CMS CRUD)
  // =========================================================================

  describe('Admin - Quản lý Chuyên mục', () => {
    it(' createCategory - tạo mới thành công', async () => {
      (categoryRepo.findOne as jest.Mock).mockResolvedValue(null);
      const result = await service.createCategory({ name: 'Tin mới' });
      expect(result.slug).toBe('tin-moi');
    });

    it(' createCategory - lỗi nếu tên đã tồn tại', async () => {
      (categoryRepo.findOne as jest.Mock).mockResolvedValue(mockCategory);
      await expect(service.createCategory({ name: 'Hướng dẫn' })).rejects.toThrow(BadRequestException);
    });

    it(' deleteCategory - xóa thành công', async () => {
      (categoryRepo.findOne as jest.Mock).mockResolvedValue(mockCategory);
      await service.deleteCategory('cat-1');
      expect(categoryRepo.remove).toHaveBeenCalled();
    });
  });

  describe('Admin - Quản lý Bài viết', () => {
    it(' getAdminArticles - trả về bài viết kèm thống kê stats', async () => {
      (articleRepo.count as jest.Mock).mockResolvedValueOnce(10).mockResolvedValueOnce(7);
      const result = await service.getAdminArticles({ page: 1, limit: 10 });
      expect(result.dashboardStats).toEqual({ total: 10, published: 7, draft: 3 });
    });

    it(' createArticle - xử lý va chạm Slug (thêm timestamp)', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValue(mockArticle); // Giả lập trùng slug
      const result = await service.createArticle({ title: 'Bài viết 1', status: ArticleStatus.DRAFT });
      expect(result.slug).toMatch(/^bai-viet-1-\d{4}$/);
    });

    it(' createArticle - upload ảnh lên MinIO nếu có file', async () => {
      await service.createArticle({ title: 'A', status: ArticleStatus.DRAFT }, { filename: 'a.jpg' } as any);
      expect(minioService.uploadFile).toHaveBeenCalled();
    });

    it(' updateArticle - bắn thông báo khi chuyển từ DRAFT sang PUBLISHED', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValue({ ...mockArticle, status: ArticleStatus.DRAFT });
      await service.updateArticle('art-1', { status: ArticleStatus.PUBLISHED });
      expect(userRepo.find).toHaveBeenCalled();
    });

    it(' deleteArticle - log lỗi nếu xóa ảnh MinIO thất bại nhưng vẫn xóa DB', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValue(mockArticle);
      (minioService.deleteFile as jest.Mock).mockRejectedValue(new Error('MinIO Error'));
      const loggerSpy = jest.spyOn(service['logger'], 'warn');
      
      await service.deleteArticle('art-1');
      expect(loggerSpy).toHaveBeenCalled();
      expect(articleRepo.remove).toHaveBeenCalled();
    });
  });
});