import {
  Controller,
  Get,
  Logger,
  Param,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { catchError, from, interval, map, of, switchMap } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRoleGuard } from '../auth/guards/orgRole.guard';
import {
  AnalyticsService,
  normalizeObservatoryRange,
} from './analytics.service';

@Controller('orgs/:slug/projects/:projectSlug/observatory')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  getDashboard(
    @Param('slug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Query('range') range: string,
  ) {
    const selectedRange = normalizeObservatoryRange(range);
    return this.analytics.getDashboard(orgSlug, projectSlug, selectedRange);
  }

  @Get('events')
  getEvents(
    @Param('slug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Query('limit') limit = '30',
    @Query('offset') offset = '0',
  ) {
    return this.analytics.getRecentEvents(
      orgSlug,
      projectSlug,
      Number(limit) || 30,
      Number(offset) || 0,
    );
  }

  @Sse('stream')
  stream(
    @Param('slug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Query('range') range: string,
  ) {
    const selectedRange = normalizeObservatoryRange(range);
    return interval(10_000).pipe(
      switchMap(() =>
        from(
          this.analytics.getDashboard(orgSlug, projectSlug, selectedRange),
        ).pipe(
          map((data) => ({ type: 'snapshot', data })),
          catchError((error: unknown) => {
            this.logger.error(
              'Failed to refresh an Observatory stream snapshot',
              error instanceof Error ? error.stack : undefined,
            );
            return of({
              type: 'telemetry-error',
              data: { message: 'Telemetry snapshot unavailable' },
            });
          }),
        ),
      ),
    );
  }
}
