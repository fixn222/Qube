import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRoleGuard } from '../auth/guards/orgRole.guard';
import { SchemaIntrospectionService } from './schema-introspection.service';

@Controller('orgs/:slug/projects/:projectSlug/schema')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class SchemaIntrospectionController {
  constructor(private readonly schema: SchemaIntrospectionService) {}

  @Get()
  getProjectSchema(
    @Param('slug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
  ) {
    return this.schema.getSnapshot(orgSlug, projectSlug);
  }
}
