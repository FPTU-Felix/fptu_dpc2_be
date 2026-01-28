import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Injectable, ForbiddenException } from '@nestjs/common'; // Thêm ForbiddenException

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:
        process.env.JWT_REFRESH_SECRET ||
        'bi_mat_refresh_token_khong_duoc_tiet_lo',
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: any) {
    const authorization = req.get('Authorization');

    if (!authorization)
      throw new ForbiddenException('Refresh token không hợp lệ');

    // Có rồi mới replace
    const refreshToken = authorization.replace('Bearer', '').trim();

    return { ...payload, refreshToken };
  }
}
