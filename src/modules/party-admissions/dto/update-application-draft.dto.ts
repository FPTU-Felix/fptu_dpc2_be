import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateApplicationDraftDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    fullName?: string;

    @IsOptional()
    @IsString()
    dateOfBirth?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    phoneNumber?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    permanentAddress?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    reasonForJoining?: string;

    @IsOptional()
    @IsString()
    partyApplicationLetter?: string;

    @IsOptional()
    @IsString()
    personalBiography?: string;

    @IsOptional()
    @IsString()
    partyMemberRecommendation?: string;

    @IsOptional()
    @IsString()
    youthUnionResolution?: string;

    @IsOptional()
    @IsString()
    otherDocuments?: string;
}
