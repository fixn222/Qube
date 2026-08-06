import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { OrgService } from './org.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@qube/types'
import { callbackify } from 'util';


@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgsController {
    constructor(private orgService : OrgService){}

    @Get()
    getMyOrgs(@CurrentUser() user : JwtPayload) {
        return this.orgService.getMyOrgs(user.sub)
    }

    @Get(':slug')
    getOrgBySlug(@Param('slug') slug : string , @CurrentUser() user : JwtPayload) {
        return this.orgService.getOrgBySlug(slug , user.sub)
    }

    @Post()
    createOrg(@Body() dto : CreateOrgDto , @CurrentUser()user : JwtPayload) {
        return this.orgService.createOrg(dto , user.sub);
    }

}