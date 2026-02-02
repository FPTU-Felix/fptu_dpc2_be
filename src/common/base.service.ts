// src/common/base.service.ts
import {
  Repository,
  FindManyOptions,
  DeepPartial,
  ObjectLiteral,
} from 'typeorm';
import {
  paginate,
  Pagination,
  IPaginationOptions,
} from 'nestjs-typeorm-paginate';
import { NotFoundException } from '@nestjs/common';

export abstract class BaseService<T extends ObjectLiteral> {
  constructor(protected readonly repository: Repository<T>) {}

  /**
   * Hàm phân trang dùng chung
   * @param options Bao gồm page và limit từ FE gửi lên
   * @param searchOptions Các điều kiện lọc (where), sắp xếp (order), hoặc join bảng (relations)
   */
  async paginate(
    options: IPaginationOptions,
    searchOptions?: FindManyOptions<T>,
  ): Promise<Pagination<T>> {
    return paginate<T>(this.repository, options, searchOptions);
  }

  // Lấy tất cả (không phân trang)
  findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  // Tìm một bản ghi theo ID
  async findOne(id: any, relations: string[] = []): Promise<T> {
    const record = await this.repository.findOne({
      where: { id } as any,
      relations,
    });
    if (!record) {
      throw new NotFoundException(`Bản ghi với ID ${id} không tồn tại`);
    }
    return record;
  }

  // Tạo mới
  async create(data: DeepPartial<T>): Promise<T> {
    const newRecord = this.repository.create(data);
    return this.repository.save(newRecord);
  }

  // Cập nhật
  async update(id: any, data: DeepPartial<T>): Promise<T> {
    await this.findOne(id); // Check xem có tồn tại không trước khi update
    await this.repository.update(id, data as any);
    return this.findOne(id);
  }

  // Xóa
  async remove(id: any): Promise<void> {
    const record = await this.findOne(id);
    await this.repository.remove(record);
  }
}
