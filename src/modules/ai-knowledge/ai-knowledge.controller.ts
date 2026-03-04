import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AiKnowledgeService } from './ai-knowledge.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetCurrentUser } from '../auth/decorators/get-user.decorator';
import { CreateAiDataDto } from './dto/create-ai-data.dto';
import { UserRole } from 'src/common/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApproveAiDataDto } from './dto/approve-ai-data.dto';

@ApiTags('AI Knowledge Management - API Quản lý Kiến thức AI')
@ApiBearerAuth()
@Controller('ai-knowledge')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AiKnowledgeController {
  constructor(private readonly aiKnowledgeService: AiKnowledgeService) {}

  @Post()
  @Roles(UserRole.PARTY_MEMBER, UserRole.COMMITTEE_MEMBER, UserRole.SECRETARY)
  @ApiOperation({ summary: 'Đảng viên gửi dữ liệu đóng góp cho AI' })
  @ApiBody({ type: CreateAiDataDto })
  create(@GetCurrentUser('sub') userId: string, @Body() dto: CreateAiDataDto) {
    return this.aiKnowledgeService.createEntry(userId, dto);
  }

  @Patch('committee/approve/:id')
  @Roles(UserRole.COMMITTEE_MEMBER, UserRole.SECRETARY)
  @ApiOperation({ summary: 'Chi ủy duyệt dữ liệu đóng góp' })
  @ApiBody({ type: ApproveAiDataDto })
  approve(
    @GetCurrentUser('sub') committeeId: string,
    @Param('id') entryId: string,
    @Body() dto: ApproveAiDataDto,
  ) {
    return this.aiKnowledgeService.approveEntry(committeeId, entryId, dto);
  }
}
