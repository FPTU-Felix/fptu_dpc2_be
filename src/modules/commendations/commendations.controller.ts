import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Patch,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CommendationsService } from './commendations.service';
import { CreateCommendationDto } from './dto/create-commendation.dto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from 'src/common/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../auth/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateCommendationDto } from './dto/update-commendation.dto';
import { GetClientIp } from '../auth/decorators/get-client-ip.decorator';

@ApiTags('Commendations (Khen thưởng Đảng viên)')
@Controller('commendations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('access-token')
export class CommendationsController {
  constructor(private readonly commendationsService: CommendationsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({ summary: 'Lấy danh sách khen thưởng (Phân trang + Lọc)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'memberId', required: false, type: String })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('year') year?: number,
    @Query('memberId') memberId?: string,
  ) {
    return await this.commendationsService.findAll(
      { page, limit },
      year ? Number(year) : undefined,
      memberId,
    );
  }

  @Post()
  @Roles(UserRole.DEPUTY_SECRETARY)
  @ApiOperation({ summary: 'Chi ủy ra Quyết định Khen thưởng Đảng viên' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @GetCurrentUser('sub') userId: string,
    @Body() dto: CreateCommendationDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.commendationsService.create(userId, dto, file);
  }

  @Patch(':id')
  @Roles(UserRole.DEPUTY_SECRETARY)
  @ApiOperation({ summary: 'Cập nhật Quyết định Khen thưởng' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @GetCurrentUser('sub') actorId: string,
    @GetClientIp() ip: string,
    @Body() dto: UpdateCommendationDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.commendationsService.update(id, actorId, ip, dto, file);
  }

  @Get('member/:memberId')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Xem lịch sử khen thưởng của 1 Đảng viên' })
  async getByMember(@Param('memberId') memberId: string) {
    return await this.commendationsService.findByMember(memberId);
  }

  @Get('my-commendations')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.ADMIN,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({
    summary: 'Lấy danh sách khen thưởng của bản thân (Dành cho Đảng viên)',
  })
  async getMyCommendations(@GetCurrentUser('sub') userId: string) {
    return await this.commendationsService.findMyCommendations(userId);
  }
}
