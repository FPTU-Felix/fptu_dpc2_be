import { Injectable, ConflictException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service'; // <--- Import service này

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findOneByUsername(
      registerDto.username,
    );
    if (existingUser) {
      throw new ConflictException('Username này đã được sử dụng!');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const newUser = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });
    const { password, ...result } = newUser;
    return result;
  }
}
