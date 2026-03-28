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

@Injectable()
export class HandbooksService {
  private readonly logger = new Logger(HandbooksService.name);
  constructor(
    @InjectRepository(Handbook)
    private readonly handbookRepo: Repository<Handbook>,
    @InjectRepository(HandbookLink)
    private readonly linkRepo: Repository<HandbookLink>,
    private minioService: MinioService,
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
    return await this.handbookRepo.save(newHandbook);
  }

  async update(id: string, dto: UpdateHandbookDto) {
    const handbook = await this.findOne(id);
    Object.assign(handbook, dto);
    return await this.handbookRepo.save(handbook);
  }

  async remove(id: string) {
    const handbook = await this.findOne(id);
    let hasMinioError = false;

    if (handbook.links && handbook.links.length > 0) {
      for (const link of handbook.links) {
        if (link.url) {
          try {
            const parts = link.url.split(`handbooks/${id}/`);
            if (parts.length === 2) {
              await this.minioService.deleteFile(`handbooks/${id}/${parts[1]}`);
            }
          } catch (e) {
            this.logger.error(
              `Lỗi dọn rác MinIO cho URL ${link.url}: ${e.message}`,
            );
            hasMinioError = true;
          }
        }
      }
    }

    await this.handbookRepo.remove(handbook);

    if (hasMinioError) {
      return {
        message:
          'Đã xóa cẩm nang thành công, nhưng một số file rác trên MinIO chưa dọn sạch được.',
      };
    }
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
      url: uploadResult.url,
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
        try {
          const parts = link.url.split(`handbooks/${link.handbook.id}/`);
          if (parts.length === 2) {
            await this.minioService.deleteFile(
              `handbooks/${link.handbook.id}/${parts[1]}`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Không thể xóa file cũ trên MinIO (có thể file không tồn tại): ${error.message}`,
          );
        }
      }
      const uploadResult = await this.minioService.uploadFile({
        file: file,
        folder: `handbooks/${link.handbook.id}`,
      });
      link.url = uploadResult.url;
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

    let hasMinioError = false;
    if (link.url) {
      try {
        const parts = link.url.split(`handbooks/${link.handbook.id}/`);
        if (parts.length === 2) {
          await this.minioService.deleteFile(
            `handbooks/${link.handbook.id}/${parts[1]}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Lỗi dọn rác MinIO cho URL ${link.url}: ${error.message}`,
        );
        hasMinioError = true;
      }
    }

    await this.linkRepo.remove(link);

    if (hasMinioError) {
      return {
        message:
          'Đã xóa tài liệu khỏi hệ thống, nhưng file vật lý trên MinIO chưa dọn được.',
      };
    }
    return { message: 'Xóa tài liệu thành công' };
  }
}
