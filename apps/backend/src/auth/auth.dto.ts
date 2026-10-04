import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() @IsNotEmpty() @MaxLength(64) username: string;
  @IsString() @IsNotEmpty() @MaxLength(200) password: string;
}

export class RefreshDto {
  @IsString() @IsNotEmpty() refreshToken: string;
}

export class LogoutDto {
  @IsOptional() @IsString() refreshToken?: string;
}

export class UpdateCredentialsDto {
  @IsString() @IsNotEmpty() currentPassword: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,32}$/, { message: 'Username must be 3-32 letters, numbers, dot, dash or underscore' })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  newPassword?: string;
}
