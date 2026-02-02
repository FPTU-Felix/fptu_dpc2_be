import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { GetCurrentUser } from 'src/modules/auth/decorators/get-user.decorator';
import { GenderEnum } from 'src/common/enums';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';

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
}
