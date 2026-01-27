import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto'; // Có thể xóa nếu chưa dùng
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterDto } from '../auth/dto/register.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll() {
    return `This action returns all users`;
  }

  // SỬA Ở ĐÂY: Đổi undefined thành null
  findOneByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  // SỬA THÊM: id là string (UUID) chứ không phải number
  update(id: string, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  // SỬA THÊM: id là string (UUID)
  remove(id: string) {
    return `This action removes a #${id} user`;
  }

  async create(registerDto: RegisterDto): Promise<User> {
    const newUser = this.usersRepository.create(registerDto);
    return await this.usersRepository.save(newUser);
  }
}
