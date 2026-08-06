import { IsString, MinLength, MaxLength } from 'class-validator';
import type { CreateProjectInput } from '@qube/types';

export class CreateProjectDto implements CreateProjectInput {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;
}
