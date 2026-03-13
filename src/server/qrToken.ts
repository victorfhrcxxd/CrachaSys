import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET ?? 'crachasys-qr-secret';

export function generateQrToken(participantId: string, eventId: string): string {
  const payload = `${participantId}:${eventId}:${Date.now()}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 16);
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyQrToken(token: string): { participantId: string; eventId: string; valid: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return { participantId: '', eventId: '', valid: false };
    const [participantId, eventId, ts, sig] = parts;
    const payload = `${participantId}:${eventId}:${ts}`;
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 16);
    return { participantId, eventId, valid: crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) };
  } catch {
    return { participantId: '', eventId: '', valid: false };
  }
}
