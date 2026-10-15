import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ProjectTelemetryInterceptor } from './project-telemetry.interceptor';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ProjectTelemetryInterceptor],
  exports: [AnalyticsService, ProjectTelemetryInterceptor],
})
export class AnalyticsModule {}
