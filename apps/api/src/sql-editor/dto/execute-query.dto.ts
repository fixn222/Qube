import { IsString, MinLength } from 'class-validator';

export class ExecuteQueryDto {
  @IsString()
  @MinLength(1)
  sql!: string;
}