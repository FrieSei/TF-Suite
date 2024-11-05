import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

interface SessionMetadata {
  userAgent: string;
  ipAddress: string;
  lastActivity: Date;
}

export class SessionManager {
  private static readonly SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  static async validateSession(sessionId: string, metadata: SessionMetadata): Promise<boolean> {
    const { data: session } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) return false;

    // Check session expiry
    if (new Date().getTime() - new Date(session.last_activity).getTime() > this.SESSION_DURATION) {
      await this.invalidateSession(sessionId);
      return false;
    }

    // Validate session fingerprint
    const currentFingerprint = this.generateFingerprint(metadata);
    if (session.fingerprint !== currentFingerprint) {
      await this.invalidateSession(sessionId);
      return false;
    }

    // Update last activity
    await supabaseAdmin
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);

    return true;
  }

  static async createSession(userId: string, metadata: SessionMetadata): Promise<string> {
    const sessionId = createHash('sha256')
      .update(randomBytes(32))
      .digest('hex');

    await supabaseAdmin.from('user_sessions').insert({
      id: sessionId,
      user_id: userId,
      fingerprint: this.generateFingerprint(metadata),
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    });

    return sessionId;
  }

  static async invalidateSession(sessionId: string): Promise<void> {
    await supabaseAdmin
      .from('user_sessions')
      .update({ invalidated_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  private static generateFingerprint(metadata: SessionMetadata): string {
    return createHash('sha256')
      .update(`${metadata.userAgent}|${metadata.ipAddress}`)
      .digest('hex');
  }
}