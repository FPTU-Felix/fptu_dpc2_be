import { IsOptional, IsString, MaxLength } from "class-validator";

export class SubmitApplicationDto {
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    reasonForJoining?: string;

    @IsOptional()
    @IsString()
    note?: string;
}
