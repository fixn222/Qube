import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import slugify from 'slugify';
import { DrizzleService } from '../db/drizzle.service';
import { organizations, orgMembers, projects } from '../db/schema';
import { CreateOrgDto } from './dto/create-org.dto';

@Injectable()
export class OrgService {
  constructor(private drizzle: DrizzleService) {}

  private generateOrgSlug(name: string): string {
    const base = slugify(`${name}-org`, { lower: true, strict: true });
    const suffix = randomBytes(3).toString('hex');

    return `${base}-${suffix}`;
  }

  async getMyOrgs(userId: string) {
    return this.drizzle.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        role: orgMembers.role,
        prjectCont: sql<number>`cast(count(distinct ${projects.id}) as int)`,
        membersCount: sql<number>`(
          select cast(count(*) as int)
          from org_members om
          where om.org_id = ${organizations.id}
            and om.removed_at is null
        )`,
      })
      .from(orgMembers)
      .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
      .leftJoin(projects, eq(projects.orgId, organizations.id))
      .where(and(eq(orgMembers.userId, userId), isNull(orgMembers.removedAt)))
      .groupBy(organizations.id, orgMembers.role);
  }
  async getOrgBySlug(slug: string, userId: string) {
    const [row] = await this.drizzle.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        role: orgMembers.role,
      })
      .from(organizations)
      .innerJoin(
        orgMembers,
        and(
          eq(orgMembers.orgId, organizations.id),
          eq(orgMembers.userId, userId),
          isNull(orgMembers.removedAt),
        ),
      )
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (!row) throw new NotFoundException('Organization not found');
    return row;
  }

  async createOrg(dto: CreateOrgDto, userId: string) {
    const [org] = await this.drizzle.db
      .insert(organizations)
      .values({
        name: dto.name,
        slug: this.generateOrgSlug(dto.name),
      })
      .returning();

    await this.drizzle.db.insert(orgMembers).values({
      orgId: org.id,
      userId,
      role: 'admin',
    });
    return org;
  }
}
