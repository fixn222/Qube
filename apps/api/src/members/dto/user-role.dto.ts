import { IsEnum } from "class-validator";
import { ORG_ROLES } from "@qube/constants";
import type { OrgRole } from "@qube/types";


export class UpdateRoleDto {
    @IsEnum(ORG_ROLES)
    role! : OrgRole;
}