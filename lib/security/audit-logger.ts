import { supabaseAdmin } from '@/lib/supabase';
import { KeyManagementService } from '../encryption/key-management';

interface AuditLogEntry {
  operation: string;
  userId: string;
  metadata?: Record<string, any>;
  severity?: 'INFO' | 'WARNING' | 'ERROR';
}

export class AuditLogger {
  private keyManager: KeyManagementService;

  constructor() {
    this.keyManager = KeyManagementService.getInstance();
  }

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const currentKeyVersion = await this.keyManager.getCurrentKeyVersion();

      const { error } = await supabaseAdmin.from('audit_logs').insert({
        operation: entry.operation,
        user_id: entry.userId,
        metadata: entry.metadata || {},
        severity: entry.severity || 'INFO',
        encryption_version: currentKeyVersion,
        timestamp: new Date().toISOString(),
        ip_address: await this.getClientIP(),
        user_agent: await this.getUserAgent()
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Use a fallback logging mechanism
      this.fallbackLog(entry, error);
    }
  }

  private async getClientIP(): Promise<string> {
    // Implement based on your setup
    return '0.0.0.0';
  }

  private async getUserAgent(): Promise<string> {
    // Implement based on your setup
    return 'Unknown';
  }

  private fallbackLog(entry: AuditLogEntry, error: any): void {
    // Implement fallback logging (e.g., to file system or external service)
    console.error('Audit log fallback:', {
      ...entry,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}