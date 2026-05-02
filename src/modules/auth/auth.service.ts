import { Injectable, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SigninDto } from './dto/signin.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signin(dto: SigninDto) {
    const user = await this.usersService.findOneByEmailOrUsername(dto.username);

    if (!user) {
      throw new ForbiddenException('Sai tài khoản hoặc mật khẩu');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      throw new ForbiddenException('Sai tài khoản hoặc mật khẩu');
    }

    if (user.isActive === false) {
      throw new ForbiddenException('Tài khoản của bạn đã bị khóa');
    }

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

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);

    return {
      message: 'Đăng xuất thành công',
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findOneById(userId);

    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Từ chối truy cập');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );

    if (!refreshTokenMatches) {
      throw new ForbiddenException('Token không hợp lệ');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.role?.name,
    );

    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async updateRefreshTokenHash(userId: string, refreshToken: string | null) {
    if (!refreshToken) {
      await this.usersService.updateRefreshToken(userId, null);
      return;
    }

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.usersService.updateRefreshToken(userId, hashedRefreshToken);
  }

  async generateTokens(userId: string, username: string, roleName?: string) {
    const payload = {
      sub: userId,
      username,
      roleName,
    };

    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets are not configured');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async googleLogin(googleUser: any) {
    if (!googleUser?.email) {
      throw new ForbiddenException('Thông tin từ Google không hợp lệ');
    }

    const user = await this.usersService.findOneByEmailOrUsername(
      googleUser.email,
    );

    if (!user) {
      throw new ForbiddenException(
        'Tài khoản Email không tồn tại trong hệ thống',
      );
    }

    if (user.isActive === false) {
      throw new ForbiddenException('Tài khoản của bạn đã bị khóa');
    }

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
}