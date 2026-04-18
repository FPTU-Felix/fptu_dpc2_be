import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './create-document.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1) return true;
    if (value === 'false' || value === false || value === '0' || value === 0) return false;
    return value;
  })
  @IsBoolean({ message: 'isFeatured phải là giá trị đúng hoặc sai' })
  isFeatured?: boolean;
}