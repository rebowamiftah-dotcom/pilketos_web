import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const keyHex = process.env.VOTER_TOKEN_ENCRYPTION_KEY;

  if (!keyHex || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error(
      'VOTER_TOKEN_ENCRYPTION_KEY belum dikonfigurasi dengan benar.',
    );
  }

  return Buffer.from(keyHex, 'hex');
}

export function encryptVoterToken(token: string): string {
  const iv = randomBytes(12);

  const cipher = createCipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

export function decryptVoterToken(encryptedToken: string): string {
  const parts = encryptedToken.split(':');

  if (
    parts.length !== 3 ||
    !/^[0-9a-f]{24}$/i.test(parts[0]) ||
    !/^[0-9a-f]{32}$/i.test(parts[1]) ||
    !/^(?:[0-9a-f]{2})+$/i.test(parts[2])
  ) {
    throw new Error('Format token terenkripsi tidak valid.');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex'),
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}