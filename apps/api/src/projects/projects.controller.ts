import { Controller, Get, Param, UseGuards , Post, Body } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { OrgRoleGuard } from "src/auth/guards/orgRole.guard";
import { ProjectService } from "./create-projects.service";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import type { JwtPayload } from "@qube/types";
import { CreateProjectDto } from "./dto/project-create.dto";
import { RequireOrgRole } from "src/auth/decorators/req-orgRole";
@Controller('orgs/:slug/projects')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectService) {}

  @Get()
  getProjects(@Param('slug') slug: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.getProjectsForOrg(slug, user.sub);
  }

  @Get(':projectSlug')
  getProject(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.getProjectBySlug(slug, projectSlug, user.sub);
  }

  @Post()
  @RequireOrgRole('admin')
  createProject(@Param('slug') slug: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(slug, dto);
  }
}