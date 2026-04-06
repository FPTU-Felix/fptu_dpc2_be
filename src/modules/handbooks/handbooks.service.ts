import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import slugify from 'slugify';

import { HandbookCategory } from './entities/handbook-category.entity';
import {
  HandbookArticle,
  ArticleStatus,
} from './entities/handbook-article.entity';
import { User } from '../users/entities/user.entity';
import { MinioService } from '../minio/minio.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from 'src/common/enums';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/handbook.dto';
import {
  CreateArticleDto,
  UpdateArticleDto,
  ArticleFilterDto,
} from './dto/handbook.dto';

@Injectable()
export class HandbooksService {
  private readonly logger = new Logger(HandbooksService.name);

  constructor(
    @InjectRepository(HandbookCategory)
    private readonly categoryRepo: Repository<HandbookCategory>,
    @InjectRepository(HandbookArticle)
    private readonly articleRepo: Repository<HandbookArticle>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly minioService: MinioService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // =========================================================================
  // 🟢 ROLE 1: ĐẢNG VIÊN (CHỈ XEM - READ ONLY)
  // =========================================================================

  /**
   * Lấy danh sách chuyên mục (Kèm số lượng bài viết đã PUBLISHED)
   * Phục vụ cho UI hiển thị: Hướng dẫn (2), Gương điển hình (1)
   */
  async getCategoriesForUser() {
    return await this.categoryRepo
      .createQueryBuilder('category')
      .loadRelationCountAndMap(
        'category.articleCount',
        'category.articles',
        'article',
        (qb) =>
          qb.where('article.status = :status', {
            status: ArticleStatus.PUBLISHED,
          }),
      )
      .getMany();
  }

  /**
   * Lấy danh sách bài viết đã xuất bản (Có phân trang và Filter)
   */
  async getPublishedArticles(
    options: IPaginationOptions,
    filters: ArticleFilterDto,
  ) {
    const queryBuilder = this.articleRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.category', 'category')
      .where('article.status = :status', { status: ArticleStatus.PUBLISHED });

    if (filters.categoryId) {
      queryBuilder.andWhere('article.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere('article.title ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    if (filters.isPinned) {
      queryBuilder.andWhere('article.isPinned = :isPinned', { isPinned: true });
    }

    // Ưu tiên ghim lên đầu, sau đó mới đến ngày đăng
    queryBuilder
      .orderBy('article.isPinned', 'DESC')
      .addOrderBy('article.createdAt', 'DESC');

    return await paginate<HandbookArticle>(queryBuilder, options);
  }

  /**
   * Xem chi tiết 1 bài viết theo Slug & Tăng lượt xem
   */
  async getArticleBySlug(slug: string) {
    const article = await this.articleRepo.findOne({
      where: { slug, status: ArticleStatus.PUBLISHED },
      relations: ['category'],
    });

    if (!article)
      throw new NotFoundException(
        'Không tìm thấy bài viết hoặc bài viết đã bị ẩn.',
      );

    // +1 Lượt xem
    article.viewCount += 1;
    await this.articleRepo.save(article);

    return article;
  }

  /**
   * Lấy danh sách "Bài cùng chuyên mục"
   */
  async getRelatedArticles(slug: string) {
    const article = await this.articleRepo.findOne({
      where: { slug },
      select: ['id', 'categoryId'],
    });
    if (!article || !article.categoryId) return [];

    return await this.articleRepo
      .createQueryBuilder('article')
      .where('article.categoryId = :categoryId', {
        categoryId: article.categoryId,
      })
      .andWhere('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .andWhere('article.id != :id', { id: article.id }) // Trừ bài hiện tại ra
      .orderBy('article.createdAt', 'DESC')
      .limit(3) // Lấy 3 bài liên quan
      .getMany();
  }

  // =========================================================================
  // 🔴 ROLE 2: CHI ỦY / BÍ THƯ (CMS ADMIN - CRUD)
  // =========================================================================

  // --- QUẢN LÝ CHUYÊN MỤC ---

  async createCategory(dto: CreateCategoryDto) {
    console.log('DTO nhận vào:', dto);
    const slug = this.generateSlug(dto.name);
    console.log('Slug được tạo:', slug);
    const existing = await this.categoryRepo.findOne({ where: { slug } });
    console.log('Kiểm tra chuyên mục tồn tại:', existing);
    if (existing) throw new BadRequestException('Chuyên mục này đã tồn tại');

    const newCategory = this.categoryRepo.create({ ...dto, slug });
    return await this.categoryRepo.save(newCategory);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Không tìm thấy chuyên mục');

    if (dto.name) {
      category.name = dto.name;
      category.slug = this.generateSlug(dto.name);
    }

    return await this.categoryRepo.save(category);
  }

  async deleteCategory(id: string) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Không tìm thấy chuyên mục');
    await this.categoryRepo.remove(category);
    return { message: 'Đã xóa chuyên mục thành công' };
  }

  // --- QUẢN LÝ BÀI VIẾT ---

  /**
   * Lấy danh sách cho Admin (kèm thống kê Dashboard)
   */
  async getAdminArticles(options: IPaginationOptions) {
    const queryBuilder = this.articleRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.category', 'category')
      .orderBy('article.createdAt', 'DESC');

    const paginatedResult = await paginate<HandbookArticle>(
      queryBuilder,
      options,
    );

    // Tính toán số liệu cho Dashboard
    const total = await this.articleRepo.count();
    const published = await this.articleRepo.count({
      where: { status: ArticleStatus.PUBLISHED },
    });
    const draft = total - published;

    return {
      ...paginatedResult,
      dashboardStats: { total, published, draft },
    };
  }

  /**
   * Tạo bài viết mới
   */
  async createArticle(
    dto: CreateArticleDto,
    file?: Express.Multer.File,
    userId?: string,
  ) {
    let slug = this.generateSlug(dto.title);

    // Xử lý trùng Slug (Thêm timestamp cho chắc cốp)
    const existingSlug = await this.articleRepo.findOne({ where: { slug } });
    if (existingSlug) slug = `${slug}-${Date.now().toString().slice(-4)}`;

    let thumbnailUrl: string | undefined = undefined;
    if (file) {
      const uploadResult = await this.minioService.uploadFile({
        file,
        folder: `handbook-thumbnails`, // Đổi folder cho chuẩn
      });
      thumbnailUrl = uploadResult.objectName;
    }

    const newArticle = this.articleRepo.create({
      ...dto,
      slug,
      thumbnailUrl,
      createdById: userId, // Lưu vết người tạo
    });

    const savedArticle = await this.articleRepo.save(newArticle);

    // Bắn thông báo nếu đăng luôn
    if (savedArticle.status === ArticleStatus.PUBLISHED) {
      this.notifyAllUsers(savedArticle.title);
    }

    return savedArticle;
  }

  /**
   * Cập nhật bài viết
   */
  async updateArticle(
    id: string,
    dto: UpdateArticleDto,
    file?: Express.Multer.File,
  ) {
    const article = await this.articleRepo.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Không tìm thấy bài viết');

    // Theo dõi xem có phải vừa chuyển từ NHÁP sang XUẤT BẢN không
    const isJustPublished =
      article.status === ArticleStatus.DRAFT &&
      dto.status === ArticleStatus.PUBLISHED;

    // Cập nhật Slug nếu đổi Title
    if (dto.title && dto.title !== article.title) {
      let slug = this.generateSlug(dto.title);
      const existingSlug = await this.articleRepo.findOne({ where: { slug } });
      if (existingSlug && existingSlug.id !== id)
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      article.slug = slug;
    }

    // Xử lý file ảnh mới
    if (file) {
      if (article.thumbnailUrl) {
        await this.minioService
          .deleteFile(article.thumbnailUrl)
          .catch((e) => this.logger.warn(`Lỗi xóa ảnh cũ: ${e}`));
      }
      const uploadResult = await this.minioService.uploadFile({
        file,
        folder: `handbook-thumbnails`,
      });
      article.thumbnailUrl = uploadResult.objectName;
    }

    Object.assign(article, dto);
    const updatedArticle = await this.articleRepo.save(article);

    if (isJustPublished) {
      this.notifyAllUsers(updatedArticle.title);
    }

    return updatedArticle;
  }

  /**
   * Xóa bài viết
   */
  async deleteArticle(id: string) {
    const article = await this.articleRepo.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Không tìm thấy bài viết');

    if (article.thumbnailUrl) {
      await this.minioService
        .deleteFile(article.thumbnailUrl)
        .catch((e) => this.logger.warn(`Lỗi xóa ảnh: ${e}`));
    }

    await this.articleRepo.remove(article);
    return { message: 'Đã xóa bài viết thành công' };
  }

  // =========================================================================
  // ⚙️ HELPER FUNCTIONS
  // =========================================================================

  private generateSlug(text: string): string {
    return slugify(text, {
      lower: true,
      strict: true,
      locale: 'vi', // Chuẩn hóa tiếng Việt
    });
  }

  private async notifyAllUsers(articleTitle: string) {
    try {
      const allUsers = await this.userRepo.find({ select: ['id', 'email'] });
      for (const user of allUsers) {
        // Tắt await để hệ thống chạy ngầm, FE không bị đơ chờ gửi mail
        this.notificationsService
          .createInternal(
            user.id,
            `📖 Sổ tay mới: ${articleTitle}`,
            `Chi ủy vừa xuất bản nội dung mới trên Sổ tay Đảng viên: <b>${articleTitle}</b>.<br/>Mời đồng chí truy cập hệ thống để theo dõi.`,
            NotificationType.HANDBOOK,
            user.email,
          )
          .catch((err) =>
            this.logger.error(`Lỗi gửi thông báo cho user ${user.id}`, err),
          );
      }
    } catch (error) {
      this.logger.error(`Lỗi tổng khi bắn thông báo: ${error.message}`);
    }
  }
}
