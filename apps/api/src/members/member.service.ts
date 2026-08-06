import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { orgMembers, organizations, users } from '../db/schema';
import { UpdateRoleDto } from './dto/update-role.dto';




@Injectable()
export class MemberService {
    constructor(private drizzle : DrizzleService) {}

     async getMembers(orgSlug: string) {
    return this.drizzle.db
      .select({
        id: orgMembers.id,
        role: orgMembers.role,
        createdAt: orgMembers.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(orgMembers)
      .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(
        and(eq(organizations.slug, orgSlug), isNull(orgMembers.removedAt)),
      );
  }
    async uodateRole (orgSlug : string , memberId : string , dto : UpdateRoleDto){
        if (dto.role === 'developer') {
            await this.ensureNotLastAdmin(orgSlug , memberId);    
        }

        const [updated] = await this.drizzle.db
        .update(orgMembers)
        .set({role : dto.role})
        .where(eq(orgMembers.id , memberId)).returning();

        if(!updated) throw new NotFoundException('Member not found');

        return updated;
 
    }


    async removeMember (orgSlug : string , memberId : string){

    await this.ensureNotLastAdmin(orgSlug , memberId);

    const [updated] = await this.drizzle.db
    .update(orgMembers)
    .set({removedAt : new Date()})
    .where(eq(orgMembers.id , memberId))
    .returning()

    if (!updated) throw new NotFoundException('Member not found');

    return {message : "Member removed"};
        
    }

   private async ensureNotLastAdmin(orgSlug : string , memberId : string) {

    const admins = await this.drizzle.db
    .select({id : orgMembers.id})
    .from(orgMembers)
    .innerJoin(organizations , eq(orgMembers.orgId , organizations.id))
    .where(
        and(
            eq(organizations.slug , orgSlug),
            eq(orgMembers.role , 'admin'),
            isNull(orgMembers.removedAt)
        )
    )

    const targetIsAdmin= admins.some((a) => memberId);

    if (targetIsAdmin && admins.length === 1) {
        throw new BadRequestException(
            "Cannot remove or demot the last admin of and organizaton"
 
        )
        
    }
   }


}