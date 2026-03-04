import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // 👇 ĐÂY LÀ ĐOẠN ĐẶC QUYỀN CHO ADMIN 👇
    // Nếu role của user là ADMIN thì Auto Pass, không cần check requiredRoles nữa
    if (user?.roleName?.includes('ADMIN') || user?.roleName === 'ADMIN') {
      return true;
    }
    // 👆 KẾT THÚC ĐOẠN ĐẶC QUYỀN 👆

    const hasRole = requiredRoles.some((role) => user.roleName?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Bạn không có quyền truy cập tính năng này');
    }

    return true;
  }
}
