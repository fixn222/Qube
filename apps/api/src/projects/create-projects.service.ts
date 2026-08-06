import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import slugify from 'slugify';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DrizzleService } from 'src/db/drizzle.service';
import { projects, organizations, orgMembers } from 'src/db/schema';
import { PROJECT_KEY_ROLE } from '@qube/constants';
import { CreateProjectDto } from './dto/project-create.dto'




@Injectable()
export class ProjectService {
    constructor(
        private drizzle: DrizzleService,
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    //utils
    private generateProjectSlug(name: string): string {
        const base = slugify(name, { lower: true, strict: true });
        const suffix = randomBytes(3).toString('hex');
        return `${base}-${suffix}`;
    }

    private signProjectKey(projectId: string, role: string): string {
        return this.jwtService.sign(
            { projectId, role },
            {
                secret: this.configService.get<string>('PROJECT_JWT_SECRET'),
                // project keys don't expire — they're rotated manually if compromised
                expiresIn: '100y',
            },
        );
    }
      private generateDbSchema(): string {
    return `proj_${randomBytes(4).toString('hex')}`;
  }

    private async provisionSchema(dbSchema: string): Promise<void> {
        await this.drizzle.db.execute(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);
    }


    async getProjectsForOrg(orgSulg: string, userId: string) {

        return this.drizzle.db.select(
            {
                id: projects.id,
                name: projects.name,
                slug: projects.slug,
                projectUrl: projects.projectUrl,
                createdAt: projects.createdAt,
                updatedAt: projects.updatedAt
            }
        ).from(projects)
            .innerJoin(organizations, eq(projects.orgId, organizations.id))
            .innerJoin(
                orgMembers,
                and(
                    eq(orgMembers.orgId, organizations.id),
                    eq(orgMembers.userId, userId),
                    isNull(orgMembers.removedAt)
                )
            ).where(eq(organizations.slug, orgSulg))

    }


    async getProjectBySlug(orgSlug : string , projectSlug :string , userId : string){
       const [row] =  await this.drizzle.db.select().from(projects).innerJoin(organizations , eq(projects.orgId , organizations.id))
        .innerJoin(
            orgMembers ,
             and(
          eq(orgMembers.orgId, organizations.id),
          eq(orgMembers.userId, userId),
          isNull(orgMembers.removedAt),
        ),
        ).where(
            and(eq(organizations.slug, orgSlug), eq(projects.slug, projectSlug)),
        ).limit(1)

        if (!row) {
            throw new NotFoundException('Project not found');
            
        }
        return row;
    }
    async createProject(orgSlug: string, dto: CreateProjectDto) {
    const [org] = await this.drizzle.db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);

    if (!org) throw new NotFoundException('Organization not found');

    const projectSlug = this.generateProjectSlug(dto.name);
    const dbSchema = this.generateDbSchema();
    const projectUrl = `${this.configService.get<string>('API_URL')}/projects/${projectSlug}`;

    await this.provisionSchema(dbSchema);

     const [project] = await this.drizzle.db
      .insert(projects)
      .values({
        orgId: org.id,
        name : dto.name,
        slug: projectSlug,
        dbSchema,
        projectUrl,
        anonKey : '' ,
        serviceRoleKey : ''
      })
      .returning();

    const anonKey = this.signProjectKey(project.id, PROJECT_KEY_ROLE.ANON);
    const serviceRoleKey = this.signProjectKey(
      project.id,
      PROJECT_KEY_ROLE.SERVICE_ROLE,
    );

    const [updated] = await this.drizzle.db
      .update(projects)
      .set({ anonKey, serviceRoleKey })
      .where(eq(projects.id, project.id))
      .returning();

    return updated;
  }

}