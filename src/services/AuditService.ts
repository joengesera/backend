import { logger } from '../utils/logger';

export interface AuditLog {
  action: string;
  userId: string;
  resourceId?: string;
  metadata?: any;
}

export interface AuditService {
  log(entry: AuditLog): Promise<void>;
}

export class ConsoleAuditService implements AuditService {
  async log(entry: AuditLog): Promise<void> {
    logger.info({ msg: 'AUDIT_LOG', ...entry });
  }
}
