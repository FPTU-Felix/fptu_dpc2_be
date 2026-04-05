import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentCategory } from './entities/document-category.entity';
import { CreateDocumentCategoryDto } from './dto/create-document-category.dto';
import { UpdateDocumentCategoryDto } from './dto/update-document-category.dto';

@Injectable()
export class DocumentCategoriesService {
  constructor(
    @InjectRepository(DocumentCategory)
    private readonly categoryRepo: Repository<DocumentCategory>,
  ) {}

  async create(dto: CreateDocumentCategoryDto) {
    const existing = await this.categoryRepo.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException('Slug này đã tồn tại, vui lòng chọn slug khác');
    }

    const category = this.categoryRepo.create(dto);
    return await this.categoryRepo.save(category);
  }

  async findAll() {
    return await this.categoryRepo.find({
      relations: ['documents'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string) { // Đổi tham số sang string
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['documents'],
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục tài liệu với ID: ${id}`);
    }
    return category;
  }

  async update(id: string, dto: UpdateDocumentCategoryDto) { // Đổi tham số sang string
    const category = await this.findOne(id);
    
    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepo.findOne({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException('Slug mới đã tồn tại');
    }

    Object.assign(category, dto);
    return await this.categoryRepo.save(category);
  }

  async remove(id: string) { // Đổi tham số sang string
    const category = await this.findOne(id);
    await this.categoryRepo.remove(category);
    return { message: `Đã xóa danh mục "${category.name}" thành công` };
  }
}