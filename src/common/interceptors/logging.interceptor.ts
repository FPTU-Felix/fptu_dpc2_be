import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import * as requestIp from 'request-ip';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditLogEvent } from 'src/modules/system/events/audit-log.event';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP_ACCESS');

  constructor(private eventEmitter: EventEmitter2) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const request = ctx.switchToHttp().getRequest();
    const response = ctx.switchToHttp().getResponse();
    const { method, originalUrl } = request;
    const ip = requestIp.getClientIp(request) || 'Unknown IP';
    const userId = request.user?.sub || null;
    const startTime = Date.now();
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        this.logger.log(
          `[${method}] ${originalUrl} - IP: ${ip} - User: ${userId} - ${statusCode} - ${duration}ms`,
        );
        if (method !== 'GET') {
          this.eventEmitter.emit(
            'audit.log',
            new AuditLogEvent(
              userId,
              `API_${method}`,
              this.extractEntityName(originalUrl),
              'N/A',
              {
                url: originalUrl,
                statusCode: statusCode,
                durationMs: duration,
                body: this.sanitizeBody(request.body),
              },
              ip,
            ),
          );
        }
      }),
      catchError((error) => {
        this.logger.error(
          `[${method}] ${originalUrl} - FAILED: ${error.message}`,
        );
        throw error;
      }),
    );
  }
  private extractEntityName(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts.length > 0 ? parts[0] : 'system';
  }
  private sanitizeBody(body: any): any {
    if (!body) return null;
    const safeBody = { ...body };
    if (safeBody.password) safeBody.password = '***HIDDEN***';
    if (safeBody.newPassword) safeBody.newPassword = '***HIDDEN***';
    return safeBody;
  }
}
