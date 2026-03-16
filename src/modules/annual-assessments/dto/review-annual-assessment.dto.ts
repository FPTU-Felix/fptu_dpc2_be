import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { AssessmentRank, AssessmentStatus } from 'src/common/enums';

export class ReviewAnnualAssessmentDto {
  @ApiProperty({
    enum: AssessmentStatus,
    description: 'Trạng thái duyệt (Thường là APPROVED)',
    example: AssessmentStatus.APPROVED,
  })
  @IsNotEmpty()
  @IsEnum(AssessmentStatus)
  status: AssessmentStatus;

  @ApiProperty({
    enum: AssessmentRank,
    description:
      'Mức xếp loại CHÍNH THỨC do Chi ủy quyết định (Có thể giống hoặc khác mức tự nhận)',
    example: AssessmentRank.GOOD,
  })
  @IsNotEmpty()
  @IsEnum(AssessmentRank)
  finalRank: AssessmentRank;
}
