import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // 1. Tạo User mới (Dùng cho Register)
  async create(registerDto: RegisterDto): Promise<User> {
    const newUser = this.usersRepository.create(registerDto);
    return await this.usersRepository.save(newUser);
  }

  // 2. Tìm theo Username (Dùng cho Login)
  async findOneByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  // 3. [MỚI] Tìm theo ID (Dùng cho JWT Strategy xác thực user từ token)
  async findOneById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
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

  // --- Các hàm CRUD cơ bản khác ---

  findAll() {
    return this.usersRepository.find();
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: string) {
    return `This action removes a #${id} user`;
  }
}
