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
    // 1. Lấy danh sách các Role được phép từ Decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu API không gắn @Roles thì cho qua (public hoặc chỉ cần login)
    if (!requiredRoles) {
      return true;
    }
    // 2. Lấy thông tin User từ Request (do AuthGuard nhét vào trước đó)
    const { user } = context.switchToHttp().getRequest();
    // 3. Kiểm tra xem Role của User có nằm trong danh sách được phép không
    const hasRole = requiredRoles.some((role) => user.roleName?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Bạn không có quyền truy cập tính năng này');
    }

    return true;
  }
}
