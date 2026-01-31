import { Controller, Get, UseGuards, Body, Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';

@Controller('admin/users')
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async findAll() {
    return await this.usersService.findAll();
  }

  @Post('create-account')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async adminCreate(@Body() dto: AdminCreateUserDto) {
    return await this.usersService.createByAdmin(dto);
  }

  @Post('resend-email')
  @Roles('ADMIN')
  async resendEmail(@Body() body: { userId: string; tempPass: string }) {
    return await this.usersService.resendWelcomeEmail(
      body.userId,
      body.tempPass,
    );
  }
}
