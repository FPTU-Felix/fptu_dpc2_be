import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SystemLog } from './entities/system-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLogEvent } from './events/audit-log.event';

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(SystemLog)
    private logRepo: Repository<SystemLog>,
  ) {}

  @OnEvent('audit.log', { async: true })
  async handleAuditLogEvent(payload: AuditLogEvent) {
    if (!payload.details) return;
    const log = this.logRepo.create(payload);
    await this.logRepo.save(log);
  }
}
