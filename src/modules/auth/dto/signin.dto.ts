import { IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class SigninDto {
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Password is required' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/, {
    message:
      'Password must be at least 6 characters long and contain letters and numbers',
  })
  password: string;
}
