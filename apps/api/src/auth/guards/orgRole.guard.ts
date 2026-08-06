
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { and, eq, isNull } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { organizations, orgMembers } from '../../db/schema';
import { ORG_ROLE_KEY } from '../decorators/req-orgRole';
import type { OrgRole, JwtPayload } from '@qube/types';
import { Request } from 'express';
import { Observable } from 'rxjs';


interface AuthenticatedReq extends Request {
    user : JwtPayload ,
    memberRole? : string
}



@Injectable()
export class OrgRoleGuard implements CanActivate {
    constructor (
        private drizzle : DrizzleService ,
        private reflector : Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
 
         const requiredRole = this.reflector.get<OrgRole>(
            ORG_ROLE_KEY , 
            context.getHandler()
         );

        const req = context.switchToHttp().getRequest<AuthenticatedReq>();
        const user = req.user ;
        const orgSlug = req.params['slug'] as string;

        const [member] = await this.drizzle.db
        .select({role : orgMembers.role}).from(orgMembers)
         .innerJoin(organizations , eq(orgMembers.orgId , organizations.id))
         .where(
            and(
                eq(organizations.slug , orgSlug) ,
                eq(orgMembers.userId , user.sub) ,
                isNull(orgMembers.removedAt)
            ),
         ).limit(1)

         if(!member) throw new NotFoundException('Organizations not found')
            if (requiredRole && member.role !== requiredRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    req.memberRole = member.role;
    return true
        }
}