import {
  Controller,
  Post,
  Body,
  UseGuards,
  Patch,
  Get,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { GetCurrentUser } from 'src/modules/auth/decorators/get-user.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailChangeDto } from './dto/verify-email-change.dto';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @UseGuards(AuthGuard('jwt'))
  @Post('request-email-change')
  @ApiOperation({ summary: 'Yêu cầu đổi email (Gửi mã vào email cũ)' })
  async requestEmailChange(@GetCurrentUser('sub') userId: string) {
    return await this.usersService.requestEmailChange(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('verify-email-change')
  @ApiOperation({ summary: 'Xác nhận mã và cập nhật email mới' })
  async verifyEmailChange(
    @GetCurrentUser('sub') userId: string,
    @Body() dto: VerifyEmailChangeDto,
  ) {
    return await this.usersService.verifyAndChangeEmail(
      userId,
      dto.token,
      dto.newEmail,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('avatar')
  @ApiOperation({
    summary: 'Cập nhật ảnh đại diện (Giới hạn 2MB + Định dạng ảnh)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(
            new BadRequestException(
              'Chỉ cho phép upload file ảnh (jpg, jpeg, png, gif)!',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadAvatar(
    @GetCurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh');
    return await this.usersService.updateAvatar(userId, file);
  }
}
