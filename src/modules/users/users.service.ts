import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}
  // 2. Tìm theo Username (Dùng cho Login)
  async findOneByUsername(username: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { username },
      relations: ['role'],
    });
  }

  // 3. [MỚI] Tìm theo ID (Dùng cho JWT Strategy xác thực user từ token)
  async findOneById(id: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  // 4. [MỚI] Cập nhật Refresh Token (Lưu vào DB khi login, xóa khi logout)
  async updateRefreshToken(
    userId: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      hashedRefreshToken: hashedRefreshToken,
    });
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find({
      select: ['id', 'username', 'isActive', 'roleId', 'createdAt'], // Chỉ lấy các cột cần thiết
      relations: ['role'], // Lấy luôn thông tin role liên kết
    });
  }
}
