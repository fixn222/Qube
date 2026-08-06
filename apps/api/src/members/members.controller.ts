import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { OrgRoleGuard } from "src/auth/guards/orgRole.guard";
import { MemberService } from "./member.service";
import { RequireOrgRole } from "src/auth/decorators/req-orgRole";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { InviteService } from "./invite.service";


@Controller('orgs/:slug/members')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class MembersController {
    constructor(
        private membersService: MemberService,
        private inviteService: InviteService

    ) { }


    @Get()
    getMembers(@Param('slug') slug: string) {
        return this.membersService.getMembers(slug)
    }

    @Patch(':memberId/role')
    @RequireOrgRole('admin')

    updateRole(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Body() dto: UpdateRoleDto
    ) {
        return this.membersService.uodateRole(slug, memberId, dto);
    }


    @Delete(':memberId')
    @RequireOrgRole('admin')
    removeMember(@Param('slug') slug: string, @Param('memberId') memberId: string) {
        return this.membersService.removeMember(slug, memberId)
    }


    @Post('invite')
    @RequireOrgRole('admin')
    sendInvite(@Param('slug') slug: string, @Body() dto: InviteMemberDto) {
        return this.inviteService.sendInvite(slug, dto.email);
    }



}