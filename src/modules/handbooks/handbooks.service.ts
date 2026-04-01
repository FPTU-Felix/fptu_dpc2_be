import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { HandbookLink } from './entities/handbook-link.entity';
import { Repository } from 'typeorm';
import { Handbook } from './entities/handbook.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateHandbookDto,
  CreateHandbookLinkDto,
  UpdateHandbookDto,
  UpdateHandbookLinkDto,
} from './dto/handbook.dto';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { MinioService } from '../minio/minio.service';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from 'src/common/enums';

@Injectable()
export class HandbooksService {
  private readonly logger = new Logger(HandbooksService.name);
  constructor(
    @InjectRepository(Handbook)
    private readonly handbookRepo: Repository<Handbook>,
    @InjectRepository(HandbookLink)
    private readonly linkRepo: Repository<HandbookLink>,
    private minioService: MinioService,
    private notificationsService: NotificationsService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findAll(options: IPaginationOptions, isActiveOnly: boolean = false) {
    const queryBuilder = this.handbookRepo
      .createQueryBuilder('handbook')
      .leftJoinAndSelect('handbook.links', 'link')
      .orderBy('handbook.createdAt', 'DESC');

    if (isActiveOnly) {
      queryBuilder.where('handbook.isActive = :isActive', { isActive: true });
    }
    return await paginate<Handbook>(queryBuilder, options);
  }

  async findOne(id: string) {
    const handbook = await this.handbookRepo.findOne({
      where: { id },
      relations: ['links'],
    });

    if (!handbook) throw new NotFoundException('Không tìm thấy Cẩm nang này');
    return handbook;
  }

  async create(dto: CreateHandbookDto) {
    const newHandbook = this.handbookRepo.create(dto);
    const savedHandbook = await this.handbookRepo.save(newHandbook);
    if (savedHandbook.isActive) {
      this.notifyAllUsers(savedHandbook.title);
    }

    return savedHandbook;
  }

  async update(id: string, dto: UpdateHandbookDto) {
    const handbook = await this.findOne(id);
    const isJustPublished = !handbook.isActive && dto.isActive;
    Object.assign(handbook, dto);
    const updatedHandbook = await this.handbookRepo.save(handbook);
    if (isJustPublished) {
      this.notifyAllUsers(updatedHandbook.title);
    }

    return updatedHandbook;
  }

  async remove(id: string) {
    const handbook = await this.findOne(id);

    if (handbook.links && handbook.links.length > 0) {
      for (const link of handbook.links) {
        if (link.url) {
          await this.minioService.deleteFile(link.url);
        }
      }
    }

    await this.handbookRepo.remove(handbook);
    return { message: 'Xóa cẩm nang và toàn bộ tài liệu thành công' };
  }

  async addLink(
    handbookId: string,
    dto: CreateHandbookLinkDto,
    file: Express.Multer.File,
  ) {
    const handbook = await this.findOne(handbookId);

    const uploadResult = await this.minioService.uploadFile({
      file: file,
      folder: `handbooks/${handbookId}`,
    });

    const newLink = this.linkRepo.create({
      ...dto,
      url: uploadResult.objectName,
      handbook: handbook,
    });

    return await this.linkRepo.save(newLink);
  }

  async updateLink(
    linkId: string,
    dto: UpdateHandbookLinkDto,
    file?: Express.Multer.File,
  ) {
    const link = await this.linkRepo.findOne({
      where: { id: linkId },
      relations: ['handbook'],
    });
    if (!link) throw new NotFoundException('Không tìm thấy đường dẫn tài liệu');

    if (file) {
      if (link.url) {
        await this.minioService.deleteFile(link.url);
      }
      const uploadResult = await this.minioService.uploadFile({
        file: file,
        folder: `handbooks/${link.handbook.id}`,
      });
      link.url = uploadResult.objectName;
    }

    Object.assign(link, dto);
    return await this.linkRepo.save(link);
  }

  async removeLink(linkId: string) {
    const link = await this.linkRepo.findOne({
      where: { id: linkId },
      relations: ['handbook'],
    });
    if (!link) throw new NotFoundException('Không tìm thấy đường dẫn tài liệu');
    if (link.url) {
      await this.minioService.deleteFile(link.url);
    }
    await this.linkRepo.remove(link);
    return { message: 'Xóa tài liệu thành công' };
  }

  private async notifyAllUsers(handbookTitle: string) {
    try {
      const allUsers = await this.userRepo.find({
        select: ['id', 'email'],
      });
      for (const user of allUsers) {
        this.notificationsService.createInternal(
          user.id,
          `📚 Cẩm nang mới: ${handbookTitle}`,
          `Chi ủy vừa đăng tải tài liệu/cẩm nang mới: <b>${handbookTitle}</b>.<br/>Đồng chí vui lòng truy cập vào hệ thống để cập nhật thông tin mới nhất.`,
          NotificationType.HANDBOOK,
          user.email,
        );
      }
    } catch (error) {
      this.logger.error(`Lỗi khi bắn thông báo cẩm nang: ${error.message}`);
    }
  }
}
