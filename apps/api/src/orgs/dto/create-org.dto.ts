import { IsString, MinLength } from 'class-validator';
import type { CreateOrgInput } from '@qube/types';

export class CreateOrgDto implements CreateOrgInput {
  @IsString()
  @MinLength(2)
  name: string;
}
