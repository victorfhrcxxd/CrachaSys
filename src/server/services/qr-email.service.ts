import { sendQrCodeEmail } from '../emailService';
import { createAuditLog } from '../auditLog';
import { assertCompanyAccess } from '../policies/access';
import { prisma } from '../prisma';
import type { SessionUser } from '../session';
import type { SendQrEmailsInput } from '../validators/qr-email.validator';
import * as ParticipantRepo from '../repositories/participants/participant.repository';

// ── Result type ───────────────────────────────────────────────────────────────

export interface SendQrResult {
  total:   number;
  sent:    number;
  skipped: number;
  failed:  number;
  errors:  string[];
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function sendQrCodes(
  user:  SessionUser,
  input: { eventId: string; onlyNew?: boolean },
): Promise<SendQrResult> {
  // 1. Verify event exists and belongs to same tenant
  const event = await prisma.event.findUnique({
    where:  { id: input.eventId },
    select: { id: true, name: true, startDate: true, location: true, companyId: true },
  });

  if (!event) throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
  assertCompanyAccess(user, event.companyId);

  // 2. Fetch eligible participants (onlyNew defaults to true if undefined)
  const onlyNew = input.onlyNew ?? true;
  const participants = await ParticipantRepo.findParticipantsForQrEmail(
    input.eventId,
    onlyNew,
  );

  const eventDate = new Date(event.startDate).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // 3. Send emails sequentially, tracking results
  let sent    = 0;
  let failed  = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const p of participants) {
    if (!p.email?.trim()) { skipped++; continue; }

    const ok = await sendQrCodeEmail({
      to:              p.email,
      participantName: p.name,
      eventName:       event.name,
      eventDate,
      eventLocation:   event.location ?? undefined,
      qrToken:         p.qrToken,
      badgeRole:       p.badgeRole,
    });

    if (ok) {
      await ParticipantRepo.markQrEmailSent(p.id);
      sent++;
    } else {
      errors.push(p.email);
      failed++;
    }
  }

  // 4. Audit log
  await createAuditLog({
    userId:    user.id,
    companyId: user.companyId,
    action:    'SEND_QR_EMAILS',
    entity:    'Event',
    entityId:  input.eventId,
    meta:      { total: participants.length, sent, failed, skipped, onlyNew: input.onlyNew },
  });

  return { total: participants.length, sent, skipped, failed, errors };
}
