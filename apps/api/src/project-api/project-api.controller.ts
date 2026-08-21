import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { PROJECT_KEY_ROLE } from '@qube/constants';
import { ProjectApiService } from './project-api.service';
import { ProjectKeyGuard, ProjectKeyPayload } from './project-key.guard';

@Controller('projects/:projectSlug/rest')
@UseGuards(ProjectKeyGuard)
export class ProjectApiController {
  constructor(private projectApiService: ProjectApiService) {}

  private getProjectKey(req: ExpressRequest): ProjectKeyPayload {
    return req['projectKey'] as ProjectKeyPayload;
  }

  private assertWriteAccess(req: ExpressRequest): void {
    const { role } = this.getProjectKey(req);
    if (role !== PROJECT_KEY_ROLE.SERVICE_ROLE) {
      throw new ForbiddenException(
        'Write operations require the service role key',
      );
    }
  }

  @Get(':table')
  getRows(
    @Req() req: ExpressRequest,
    @Param('projectSlug') projectSlug: string,
    @Param('table') table: string,
    @Query() query: Record<string, string>,
  ) {
    const { projectId } = this.getProjectKey(req);
    return this.projectApiService.getRows(projectId, projectSlug, table, query);
  }

  @Post(':table')
  insertRow(
    @Req() req: ExpressRequest,
    @Param('projectSlug') projectSlug: string,
    @Param('table') table: string,
    @Body() body: Record<string, unknown>,
  ) {
    this.assertWriteAccess(req);
    const { projectId } = this.getProjectKey(req);
    return this.projectApiService.insertRow(
      projectId,
      projectSlug,
      table,
      body,
    );
  }

  @Patch(':table/:id')
  updateRow(
    @Req() req: ExpressRequest,
    @Param('projectSlug') projectSlug: string,
    @Param('table') table: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    this.assertWriteAccess(req);
    const { projectId } = this.getProjectKey(req);
    return this.projectApiService.updateRow(
      projectId,
      projectSlug,
      table,
      id,
      body,
    );
  }

  @Delete(':table/:id')
  deleteRow(
    @Req() req: ExpressRequest,
    @Param('projectSlug') projectSlug: string,
    @Param('table') table: string,
    @Param('id') id: string,
  ) {
    this.assertWriteAccess(req);
    const { projectId } = this.getProjectKey(req);
    return this.projectApiService.deleteRow(projectId, projectSlug, table, id);
  }
}
