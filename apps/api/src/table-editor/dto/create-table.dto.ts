import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { COLUMN_TYPES } from '@qube/constants';
import type {
  CreateTableInput,
  CreateColInput,
  ColumnType,
} from '@qube/types';

export class CreateColumnDto implements CreateColInput {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(COLUMN_TYPES)
  type!: ColumnType;

  @IsBoolean()
  isNullable!: boolean;

  @IsBoolean()
  isPrimaryKey!: boolean;

  @IsString()
  @IsOptional()
  defaultValue?: string;

  @IsString()
  @IsOptional()
  foreignKeyTable?: string;

  @IsString()
  @IsOptional()
  foreignKeyColumn?: string;
}

export class CreateTableDto implements CreateTableInput {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateColumnDto)
  columns!: CreateColumnDto[];
}