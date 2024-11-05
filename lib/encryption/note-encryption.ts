import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class NoteEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 12; // 96 bits for GCM

  constructor(private readonly encryptionKey: Buffer) {
    if (encryptionKey.length !== this.keyLength) {
      throw new Error('Invalid encryption key length');
    }
  }

  async encryptNote(content: string): Promise<{
    encryptedContent: Buffer;
    iv: Buffer;
    authTag: Buffer;
  }> {
    try {
      const iv = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(content, 'utf8'),
        cipher.final()
      ]);

      return {
        encryptedContent: encrypted,
        iv,
        authTag: cipher.getAuthTag()
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt note content');
    }
  }

  async decryptNote(
    encryptedContent: Buffer,
    iv: Buffer,
    authTag: Buffer
  ): Promise<string> {
    try {
      const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encryptedContent),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt note content');
    }
  }

  async encryptFile(file: Buffer): Promise<{
    encryptedFile: Buffer;
    iv: Buffer;
    authTag: Buffer;
  }> {
    try {
      const iv = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(file),
        cipher.final()
      ]);

      return {
        encryptedFile: encrypted,
        iv,
        authTag: cipher.getAuthTag()
      };
    } catch (error) {
      console.error('File encryption error:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  async decryptFile(
    encryptedFile: Buffer,
    iv: Buffer,
    authTag: Buffer
  ): Promise<Buffer> {
    try {
      const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      return Buffer.concat([
        decipher.update(encryptedFile),
        decipher.final()
      ]);
    } catch (error) {
      console.error('File decryption error:', error);
      throw new Error('Failed to decrypt file');
    }
  }
}