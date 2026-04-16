import { Injectable, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SigninDto } from './dto/signin.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // --- 1. ĐĂNG NHẬP ---
  async signin(dto: SigninDto) {
    const user = await this.usersService.findOneByEmailOrUsername(dto.username);
    if (!user) throw new ForbiddenException('Sai tài khoản hoặc mật khẩu');

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches)
      throw new ForbiddenException('Sai tài khoản hoặc mật khẩu');
    if (user.isActive === false)
      throw new ForbiddenException('Tài khoản của bạn đã bị khóa');
    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.role?.name,
    );

    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return {
      ...tokens,
      isFirstLogin: user.isFirstLogin,
      role: user.role?.name,
    };
  }
  // --- 2. ĐĂNG XUẤT ---
  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Đăng xuất thành công' };
  }

  // --- 3. LẤY TOKEN MỚI (REFRESH) ---
  async refreshTokens(userId: string, rt: string) {
    const user = await this.usersService.findOneById(userId);
    console.log('USER REFRESH', user);
    if (!user || !user.hashedRefreshToken)
      throw new ForbiddenException('Từ chối truy cập');

    const rtMatches = await bcrypt.compare(rt, user.hashedRefreshToken);
    if (!rtMatches) throw new ForbiddenException('Token không hợp lệ');
    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.role?.name,
    );
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async updateRefreshTokenHash(userId: string, rt: string | null) {
    if (!rt) {
      await this.usersService.updateRefreshToken(userId, null);
      return;
    }
    const hash = await bcrypt.hash(rt, 10);
    await this.usersService.updateRefreshToken(userId, hash);
  }

  async generateTokens(userId: string, username: string, roleName: string) {
    const payload = {
      sub: userId,
      username,
      roleName,
    };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken: at, refreshToken: rt };
  }
}
