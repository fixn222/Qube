import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { catchError, defer, tap, throwError } from 'rxjs';
import { AnalyticsService } from './analytics.service';

type ProjectRequest = Request & { projectKey?: { projectId?: string } };

@Injectable()
export class ProjectTelemetryInterceptor implements NestInterceptor {
  constructor(private readonly analytics: AnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<ProjectRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const projectId = request.projectKey?.projectId;
    if (!projectId) return next.handle();
    const start = Date.now();
    const resourceParam = request.params?.table;
    const resource =
      typeof resourceParam === 'string' ? resourceParam : undefined;
    const operation = request.method;
    return defer(() => next.handle()).pipe(
      tap(
        () =>
          void this.analytics.recordSafely({
            projectId,
            eventType: 'api.request',
            source: 'project_api',
            requestId: request.header('x-request-id'),
            durationMs: Date.now() - start,
            statusCode: response.statusCode,
            success: response.statusCode < 400,
            operation,
            resource,
          }),
      ),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException ? error.getStatus() : 500;
        void this.analytics.recordSafely({
          projectId,
          eventType: 'api.request',
          source: 'project_api',
          requestId: request.header('x-request-id'),
          durationMs: Date.now() - start,
          statusCode,
          success: false,
          operation,
          resource,
          errorCode: `HTTP_${statusCode}`,
        });
        return throwError(() => error);
      }),
    );
  }
}
