import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { GetCurrentUser } from 'src/modules/auth/decorators/get-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('complete-profile')
  @UseGuards(AuthGuard('jwt'))
  async completeProfile(
    @GetCurrentUser('id') userId: string, // Lấy ID trực tiếp ở đây
    @Body() dto: CompleteProfileDto,
  ) {
    return await this.usersService.completeProfile(userId, dto);
  }
}
