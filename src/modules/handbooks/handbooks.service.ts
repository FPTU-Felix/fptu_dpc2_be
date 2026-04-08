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
import { EventEmitter2 } from 'eventemitter2';
import { AuditLogEvent } from '../system/events/audit-log.event';
import { getObjectDiff } from 'src/common/utils/diff.util';

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
    private readonly eventEmitter: EventEmitter2,
  ) {}

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

  async createCategory(dto: CreateCategoryDto, userId: string, ip: string) {
    const slug = this.generateSlug(dto.name);
    const existing = await this.categoryRepo.findOne({ where: { slug } });
    if (existing) throw new BadRequestException('Chuyên mục này đã tồn tại');

    const newCategory = this.categoryRepo.create({ ...dto, slug });
    const saved = await this.categoryRepo.save(newCategory);
    this.eventEmitter.emit(
      'audit.log',
      new AuditLogEvent(
        userId,
        'CREATE_CATEGORY',
        'handbooks',
        saved.id,
        saved,
        ip,
      ),
    );
    return saved;
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    userId: string,
    ip: string,
  ) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Không tìm thấy chuyên mục');

    const oldData = { ...category };
    if (dto.name) {
      category.name = dto.name;
      category.slug = this.generateSlug(dto.name);
    }

    const updatedCategory = await this.categoryRepo.save(category);
    const change = getObjectDiff(oldData, updatedCategory);
    if (change) {
      this.eventEmitter.emit(
        'audit.log',
        new AuditLogEvent(
          userId,
          'UPDATE_CATEGORY',
          'handbooks',
          updatedCategory.id,
          change,
          ip,
        ),
      );
    }
    return updatedCategory;
  }

  async deleteCategory(id: string, userId: string, ip: string) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Không tìm thấy chuyên mục');
    await this.categoryRepo.remove(category);
    this.eventEmitter.emit(
      'audit.log',
      new AuditLogEvent(
        userId,
        'DELETE_CATEGORY',
        'handbooks',
        category.id,
        category,
        ip,
      ),
    );
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
    ip?: string,
  ) {
    let slug = this.generateSlug(dto.title);
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
    if (savedArticle.status === ArticleStatus.PUBLISHED) {
      this.notifyAllUsers(savedArticle.title);
    }
    this.eventEmitter.emit(
      'audit.log',
      new AuditLogEvent(
        userId || 'unknown',
        'CREATE_ARTICLE',
        'handbooks',
        savedArticle.id,
        savedArticle,
        ip,
      ),
    );
    return savedArticle;
  }

  /**
   * Cập nhật bài viết
   */
  async updateArticle(
    id: string,
    userId: string,
    ip: string,
    dto: UpdateArticleDto,
    file?: Express.Multer.File,
  ) {
    const article = await this.articleRepo.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Không tìm thấy bài viết');
    const oldData = { ...article };
    const isJustPublished =
      article.status === ArticleStatus.DRAFT &&
      dto.status === ArticleStatus.PUBLISHED;
    if (dto.title && dto.title !== article.title) {
      let slug = this.generateSlug(dto.title);
      const existingSlug = await this.articleRepo.findOne({ where: { slug } });
      if (existingSlug && existingSlug.id !== id)
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      article.slug = slug;
    }
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
    const changes = getObjectDiff(oldData, updatedArticle);
    if (changes) {
      this.eventEmitter.emit(
        'audit.log',
        new AuditLogEvent(
          userId,
          'UPDATE_MEETING',
          'meetings',
          article.id,
          changes,
          ip,
        ),
      );
    }

    if (isJustPublished) {
      this.notifyAllUsers(updatedArticle.title);
    }

    return updatedArticle;
  }

  /**
   * Xóa bài viết
   */
  async deleteArticle(id: string, userId: string, ip: string) {
    const article = await this.articleRepo.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Không tìm thấy bài viết');

    if (article.thumbnailUrl) {
      await this.minioService
        .deleteFile(article.thumbnailUrl)
        .catch((e) => this.logger.warn(`Lỗi xóa ảnh: ${e}`));
    }

    await this.articleRepo.remove(article);
    this.eventEmitter.emit(
      'audit.log',
      new AuditLogEvent(
        userId,
        'DELETE_ARTICLE',
        'handbooks',
        article.id,
        null,
        ip,
      ),
    );
    return { message: 'Đã xóa bài viết thành công' };
  }

  // =========================================================================
  // ⚙️ HELPER FUNCTIONS
  // =========================================================================

  private generateSlug(text: string): string {
    return slugify(text, {
      lower: true,
      strict: true,
      locale: 'vi',
    });
  }

  private async notifyAllUsers(articleTitle: string) {
    try {
      const allUsers = await this.userRepo.find({ select: ['id', 'email'] });
      for (const user of allUsers) {
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
