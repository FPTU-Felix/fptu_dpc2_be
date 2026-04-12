import { Controller, Post, Body, UseGuards, Patch, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { GetCurrentUser } from 'src/modules/auth/decorators/get-user.decorator';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiBearerAuth('access-token')
@ApiTags('Users - API Cho User')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('complete-profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Hoàn thành hồ sơ người dùng' })
  async completeProfile(
    @GetCurrentUser('sub') userId: string,
    @Body() dto: CompleteProfileDto,
  ) {
    return await this.usersService.completeProfile(userId, dto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Yêu cầu khôi phục mật khẩu qua Email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'vana.fptu@gmail.com' },
      },
      required: ['email'],
    },
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.usersService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu mới bằng Token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'abc123... (lấy từ email)' },
        newPassword: { type: 'string', example: 'NewPass123!' },
      },
      required: ['token', 'newPassword'],
    },
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  @ApiOperation({ summary: 'Đảng viên tự cập nhật thông tin cá nhân' })
  updateMyProfile(
    @GetCurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin hồ sơ cá nhân' })
  async getMyProfile(@GetCurrentUser('sub') userId: string) {
    return await this.usersService.getProfile(userId);
  }
}
