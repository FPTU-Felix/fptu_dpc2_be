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
  ParseIntPipe,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import { DisciplinesService } from './disciplines.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { GetCurrentUser } from '../../modules/auth/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import { Role } from '../roles/entities/role.entity';

@ApiTags('Disciplines (Kỷ luật Đảng viên)')
@Controller('disciplines')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class DisciplinesController {
  constructor(private readonly disciplinesService: DisciplinesService) {}

  @Post()
  @Roles(UserRole.SECRETARY, UserRole.DEPUTY_SECRETARY)
  @ApiOperation({ summary: 'Chi ủy ra Quyết định Kỷ luật Đảng viên' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @GetCurrentUser('sub') userId: string,
    @Body() dto: CreateDisciplineDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.disciplinesService.create(userId, dto, file);
  }

  @Patch(':id')
  @Roles(UserRole.SECRETARY, UserRole.DEPUTY_SECRETARY)
  @ApiOperation({ summary: 'Cập nhật Quyết định Kỷ luật' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDisciplineDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.disciplinesService.update(id, dto, file);
  }

  @Get('member/:memberId')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Xem lịch sử kỷ luật của 1 Đảng viên' })
  async getByMember(@Param('memberId') memberId: string) {
    return await this.disciplinesService.findByMember(memberId);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({ summary: 'Lấy danh sách kỷ luật (Phân trang + Lọc)' })
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
    return await this.disciplinesService.findAll(
      { page, limit },
      year ? Number(year) : undefined,
      memberId,
    );
  }

  @Get('my-disciplines')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.ADMIN,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({
    summary: 'Lấy danh sách kỷ luật của bản thân (Dành cho Đảng viên)',
  })
  async getMyDisciplines(@GetCurrentUser('sub') userId: string) {
    return await this.disciplinesService.findMyDisciplines(userId);
  }
}
