import { Module } from "@nestjs/common";
import { OrgService } from "./org.service";
import { OrgsController } from "./org.controller";
import { AuthModule } from "src/auth/auth.module";


@Module({
    imports : [AuthModule] ,
    providers : [OrgService] ,
    controllers : [OrgsController] ,
    exports : [OrgService]
})
export class OrgsModule {}
