import { Controller, Post, Body, UseGuards, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { GetCurrentUser } from 'src/modules/auth/decorators/get-user.decorator';
import { GenderEnum } from 'src/common/enums';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('complete-profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: {
          type: 'string',
          example: 'Nguyễn Văn A',
          description: 'Họ và tên đầy đủ',
        },
        gender: {
          type: 'string',
          enum: Object.values(GenderEnum),
          example: GenderEnum.MALE,
          description: 'Giới tính',
        },
        dateOfBirth: {
          type: 'string',
          format: 'date',
          example: '2005-01-01',
          description: 'Ngày sinh theo định dạng YYYY-MM-DD',
        },
        hometown: {
          type: 'string',
          example: 'Hà Nội',
          description: 'Quê quán',
        },
        phone: {
          type: 'string',
          example: '0987654321',
          description: 'Số điện thoại (định dạng VN)',
        },
        newPassword: {
          type: 'string',
          format: 'password',
          example: 'Password123!',
          description: 'Mật khẩu mới (tối thiểu 8 ký tự)',
        },
        confirmPassword: {
          type: 'string',
          format: 'password',
          example: 'Password123!',
          description: 'Xác nhận lại mật khẩu mới',
        },
      },
      required: [
        'fullName',
        'gender',
        'dateOfBirth',
        'hometown',
        'newPassword',
        'confirmPassword',
      ],
    },
  })
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: {
          type: 'string',
          example: 'Nguyễn Văn A',
          description: 'Họ và tên đầy đủ',
        },
        gender: {
          type: 'string',
          enum: Object.values(GenderEnum),
          example: GenderEnum.MALE,
          description: 'Giới tính',
        },
        dob: {
          type: 'string',
          format: 'date',
          example: '2005-01-01',
          description: 'Ngày sinh theo định dạng YYYY-MM-DD',
        },
        hometown: {
          type: 'string',
          example: 'Hà Nội',
          description: 'Quê quán',
        },
        phone: {
          type: 'string',
          example: '0987654321',
          description: 'Số điện thoại (định dạng VN)',
        },
      },
    },
  })
  updateMyProfile(
    @GetCurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }
}
