import { randomBytes, createHash } from 'node:crypto';

export function generateVoterToken(): string {
  return randomBytes(16).toString('hex').toUpperCase();
}

export function hashVoterToken(token: string): string {
  return createHash('sha256')
    .update(token.trim().toUpperCase(), 'utf8')
    .digest('hex');
}