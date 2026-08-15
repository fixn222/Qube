import { IsIn, IsOptional, IsString } from 'class-validator';
import { COLUMN_TYPES } from '@qube/constants';
import type { ColumnType } from '@qube/types';

export class AddColumnDto {
  @IsString()
  name!: string;

  @IsIn(COLUMN_TYPES)
  type!: ColumnType;

  @IsOptional()
  @IsString()
  defaultValue?: string;
}