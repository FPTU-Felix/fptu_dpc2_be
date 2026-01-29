import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // --- 1. ĐĂNG NHẬP ---
  async signin(dto: RegisterDto) {
    const user = await this.usersService.findOneByUsername(dto.username);
    if (!user) throw new ForbiddenException('Sai tài khoản hoặc mật khẩu');

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches)
      throw new ForbiddenException('Sai tài khoản hoặc mật khẩu');
    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.roleId,
    );
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  // --- 2. ĐĂNG XUẤT ---
  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Đăng xuất thành công' };
  }

  // --- 3. LẤY TOKEN MỚI (REFRESH) ---
  async refreshTokens(userId: string, rt: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user || !user.hashedRefreshToken)
      throw new ForbiddenException('Từ chối truy cập');

    const rtMatches = await bcrypt.compare(rt, user.hashedRefreshToken);
    if (!rtMatches) throw new ForbiddenException('Token không hợp lệ');

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.roleId,
    );
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async register(registerDto: RegisterDto) {
    // 1. Kiểm tra xem username đã tồn tại chưa
    const existingUser = await this.usersService.findOneByUsername(
      registerDto.username,
    );
    if (existingUser) {
      throw new ForbiddenException('Username này đã được sử dụng!');
    }

    // 2. Mã hóa mật khẩu (Hashing)
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    // 3. Lưu User mới vào Database
    const newUser = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // 4. Tạo luôn cặp Token (để User đăng ký xong là vào luôn, đỡ phải login lại)
    const tokens = await this.generateTokens(
      newUser.id,
      newUser.username,
      newUser.roleId,
    );

    // 5. Lưu Hash của Refresh Token xuống DB (để sau này cấp lại token mới)
    await this.updateRefreshTokenHash(newUser.id, tokens.refreshToken);

    return tokens;
  }

  async updateRefreshTokenHash(userId: string, rt: string) {
    const hash = await bcrypt.hash(rt, 10);
    await this.usersService.updateRefreshToken(userId, hash);
  }

  async generateTokens(userId: string, username: string, roleId: string) {
    const payload = { sub: userId, username, roleId };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          'bi_mat_access_token_khong_duoc_tiet_lo',
        expiresIn: '15m', // Access Token sống 15 phút
      }),
      this.jwtService.signAsync(payload, {
        secret:
          process.env.JWT_REFRESH_SECRET ||
          'bi_mat_refresh_token_khong_duoc_tiet_lo',
        expiresIn: '7d', // Refresh Token sống 7 ngày
      }),
    ]);

    return {
      accessToken: at,
      refreshToken: rt,
    };
  }
}
