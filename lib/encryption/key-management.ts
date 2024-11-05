import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

const KEY_VERSION = 1;
const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export class KeyManagementService {
  private static instance: KeyManagementService;
  private masterKey: Buffer;
  private keyCache: Map<number, Buffer>;

  private constructor() {
    this.masterKey = Buffer.from(process.env.MASTER_KEY_BASE64 || '', 'base64');
    this.keyCache = new Map();
  }

  static getInstance(): KeyManagementService {
    if (!this.instance) {
      this.instance = new KeyManagementService();
    }
    return this.instance;
  }

  async deriveKey(version: number): Promise<Buffer> {
    if (this.keyCache.has(version)) {
      return this.keyCache.get(version)!;
    }

    const salt = await this.getKeySalt(version);
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      scrypt(this.masterKey, salt, 32, SCRYPT_PARAMS, (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });

    this.keyCache.set(version, derivedKey);
    return derivedKey;
  }

  async rotateKey(): Promise<number> {
    const newVersion = KEY_VERSION + 1;
    const newSalt = randomBytes(32);

    await supabaseAdmin.from('encryption_keys').insert({
      version: newVersion,
      salt: newSalt.toString('base64'),
      created_at: new Date().toISOString()
    });

    return newVersion;
  }

  private async getKeySalt(version: number): Promise<Buffer> {
    const { data, error } = await supabaseAdmin
      .from('encryption_keys')
      .select('salt')
      .eq('version', version)
      .single();

    if (error || !data) {
      throw new Error('Failed to retrieve key salt');
    }

    return Buffer.from(data.salt, 'base64');
  }

  async getCurrentKeyVersion(): Promise<number> {
    return KEY_VERSION;
  }
}