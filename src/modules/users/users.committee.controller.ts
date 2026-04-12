import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUser } from '../../modules/auth/decorators/get-user.decorator';
import { DefaultValuePipe, ParseIntPipe } from '@nestjs/common/pipes';
@ApiBearerAuth('access-token')
@ApiTags('Users - Api cho Chi ủy liên quan đến Users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('committee/members')
export class UsersCommitteeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({
    summary: 'Chi ủy lấy danh sách thành viên trong Chi bộ mình',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getMyCellMembers(
    @GetCurrentUser('id') userId: string, // Lấy ID của người đang gọi API
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    return await this.usersService.paginateMembersByCell(userId, {
      page,
      limit,
    });
  }
}
