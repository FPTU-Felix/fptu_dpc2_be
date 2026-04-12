import {
  Controller,
  Get,
  UseGuards,
  Body,
  Post,
  DefaultValuePipe,
  ParseIntPipe,
  Query,
  Patch,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums';

@ApiBearerAuth('access-token')
@ApiTags('Users - Quản lý người dùng (Admin)')
@Controller('admin/users')
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lấy danh sách người dùng phân trang' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    const maxLimit = limit > 100 ? 100 : limit;
    return await this.usersService.paginate(
      {
        page,
        limit: maxLimit,
        route: 'https://fptu-dpc2-be.onrender.com/users',
      },
      {
        order: { createdAt: 'DESC' },
        relations: ['role'],
      },
    );
  }

  @Post('create-account')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          example: 'nguyenvana_backend',
          description: 'Tên đăng nhập của người dùng',
        },
        email: {
          type: 'string',
          example: 'vana.fptu@gmail.com',
          description: 'Email liên lạc chính thức',
        },
        roleName: {
          type: 'string',
          enum: Object.values(UserRole),
          example: UserRole.PARTY_MEMBER,
          description: 'Vai trò trong hệ thống',
        },
      },
      required: ['username', 'email', 'roleName'],
    },
  })
  @ApiOperation({ summary: 'Tạo tài khoản người dùng mới (Admin)' })
  async adminCreate(@Body() dto: AdminCreateUserDto) {
    return await this.usersService.createByAdmin(dto);
  }

  @Post('resend-email')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Gửi lại email thông báo tài khoản mới (Admin)' })
  async resendEmail(@Body() body: { userId: string; tempPass: string }) {
    return await this.usersService.resendWelcomeEmail(
      body.userId,
      body.tempPass,
    );
  }

  @Patch(':id/ban')
  @ApiOperation({ summary: 'Khóa (Ban) tài khoản người dùng' })
  @Roles('ADMIN', 'SECRETARY')
  async banUser(@Param('id') id: string) {
    return this.usersService.banUser(id);
  }

  @Patch(':id/unban')
  @ApiOperation({ summary: 'Mở khóa (Unban) tài khoản người dùng' })
  @Roles('ADMIN', 'SECRETARY')
  async unbanUser(@Param('id') id: string) {
    return this.usersService.unbanUser(id);
  }
}
