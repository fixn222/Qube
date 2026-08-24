import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SqlEditorService } from './sql-editor.service';
import { ExecuteQueryDto } from './dto/execute-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRoleGuard } from '../auth/guards/orgRole.guard'

@Controller('orgs/:slug/projects/:projectSlug/sql')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class SqlEditorController {
  constructor(private sqlEditorService: SqlEditorService) {}

  @Post()
  executeQuery(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Body() dto: ExecuteQueryDto,
  ) {
    return this.sqlEditorService.executeQuery(slug, projectSlug, dto.sql);
  }

  @Get('history')
  getHistory(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
  ) {
    return this.sqlEditorService.getHistory(slug, projectSlug);
  }
}