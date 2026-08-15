import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TableEditorService } from './table-editor.service';
import { CreateTableDto } from './dto/create-table.dto';
import { AddColumnDto } from './dto/alter-table.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRoleGuard } from 'src/auth/guards/orgRole.guard';

@Controller('orgs/:slug/projects/:projectSlug/tables')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class TableEditorController {
  constructor(private tableEditorService: TableEditorService) {}

  @Get()
  getTables(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
  ) {
    return this.tableEditorService.getTables(slug, projectSlug);
  }

  @Get(':tableName/rows')
  getTableRows(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tableEditorService.getTableRows(
      slug,
      projectSlug,
      tableName,
      limit ? parseInt(limit, 10) : 100,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get(':tableName')
  getTableInfo(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
  ) {
    return this.tableEditorService.getTableInfo(slug, projectSlug, tableName);
  }

  @Post()
  createTable(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Body() dto: CreateTableDto,
  ) {
    return this.tableEditorService.createTable(slug, projectSlug, dto);
  }

  @Patch(':tableName/columns')
  addColumn(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Body() dto: AddColumnDto,
  ) {
    return this.tableEditorService.addColumn(slug, projectSlug, tableName, dto);
  }

  @Delete(':tableName/columns/:columnName')
  dropColumn(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Param('columnName') columnName: string,
  ) {
    return this.tableEditorService.dropColumn(
      slug,
      projectSlug,
      tableName,
      columnName,
    );
  }

  @Delete(':tableName')
  deleteTable(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
  ) {
    return this.tableEditorService.deleteTable(slug, projectSlug, tableName);
  }

  @Patch(':tableName/rows/:pkValue')
  updateRow(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Param('pkValue') pkValue: string,
    @Body() body: { pkColumn: string; updates: Record<string, unknown> },
  ) {
    return this.tableEditorService.updateRow(
      slug,
      projectSlug,
      tableName,
      body.pkColumn,
      pkValue,
      body.updates,
    );
  }
}