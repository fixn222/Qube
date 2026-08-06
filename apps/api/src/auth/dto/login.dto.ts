import { IsEmail, IsString } from 'class-validator';
import { LoginInput } from '@qube/types';

export class LogInDto implements LoginInput {
  @IsEmail()
  email!: string;
  @IsString()
  password!: string;
}
