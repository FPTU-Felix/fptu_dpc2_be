import { Injectable, NotFoundException } from '@nestjs/common';
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
@Injectable()
export class HandbooksService {
  constructor(
    @InjectRepository(Handbook)
    private readonly handbookRepo: Repository<Handbook>,

    @InjectRepository(HandbookLink)
    private readonly linkRepo: Repository<HandbookLink>,
  ) {}

  // ==========================================
  // QUẢN LÝ HANDBOOK (CẨM NANG)
  // ==========================================

  async findAll(options: IPaginationOptions, isActiveOnly: boolean = false) {
    const queryBuilder = this.handbookRepo
      .createQueryBuilder('handbook')
      // Lấy kèm mảng link (Tương đương relations: ['links'])
      .leftJoinAndSelect('handbook.links', 'link')
      .orderBy('handbook.createdAt', 'DESC');

    if (isActiveOnly) {
      queryBuilder.where('handbook.isActive = :isActive', { isActive: true });
    }

    // Thư viện sẽ tự động đếm tổng số bản ghi và cắt data theo page/limit
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
    // Nhờ có onDelete: 'CASCADE' ở Entity, khi xóa Handbook thì các Link con tự bốc hơi
    await this.handbookRepo.remove(handbook);
    return { message: 'Xóa cẩm nang thành công' };
  }

  // ==========================================
  // QUẢN LÝ HANDBOOK LINKS (TÀI LIỆU CON)
  // ==========================================

  async addLink(handbookId: string, dto: CreateHandbookLinkDto) {
    const handbook = await this.findOne(handbookId); // Đảm bảo handbook tồn tại

    const newLink = this.linkRepo.create({
      ...dto,
      handbook: handbook, // Tạo liên kết khóa ngoại
    });

    return await this.linkRepo.save(newLink);
  }

  async updateLink(linkId: string, dto: UpdateHandbookLinkDto) {
    const link = await this.linkRepo.findOne({ where: { id: linkId } });
    if (!link) throw new NotFoundException('Không tìm thấy đường dẫn tài liệu');

    Object.assign(link, dto);
    return await this.linkRepo.save(link);
  }

  async removeLink(linkId: string) {
    const link = await this.linkRepo.findOne({ where: { id: linkId } });
    if (!link) throw new NotFoundException('Không tìm thấy đường dẫn tài liệu');

    await this.linkRepo.remove(link);
    return { message: 'Xóa tài liệu thành công' };
  }
}
