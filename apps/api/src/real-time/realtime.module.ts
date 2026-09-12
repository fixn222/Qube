import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeController } from './realtime.controller';
import { TrigerService } from './trigger.service';
import { AuthModule } from '../auth/auth.module';
import { OrgRoleGuard } from '../auth/guards/orgRole.guard';

@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway, RealtimeService, TrigerService, OrgRoleGuard],
  controllers: [RealtimeController],
})
export class RealtimeModule {}
