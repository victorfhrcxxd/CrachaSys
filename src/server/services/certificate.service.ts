/**
 * server/services/certificate.service.ts
 * Lógica de negócio para emissão de certificados.
 */

import { checkPlanLimit } from '../planLimits';
import { createAuditLog } from '../auditLog';
import type { SessionUser } from '../session';
import * as CertRepo from '../repositories/certificates/certificate.repository';

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listCertificates(user: SessionUser) {
  if (user.role === 'SUPER_ADMIN') return CertRepo.findAllCertificates();
  return CertRepo.findCertificatesByCompany(user.companyId);
}

export async function getCertificate(id: string) {
  return CertRepo.findCertificateById(id);
}

// ── Emissão individual ───────────────────────────────────────────────────────

export async function issueCertificate(
  user: SessionUser,
  participantId: string,
  eventId: string,
) {
  const limit = await checkPlanLimit(user.companyId, 'certificates');
  if (!limit.allowed) {
    throw Object.assign(
      new Error(`Limite do plano atingido (${limit.current}/${limit.max} certificados).`),
      { statusCode: 402, meta: { plan: limit.plan } },
    );
  }

  const cert = await CertRepo.createCertificate(participantId, eventId);

  await createAuditLog({
    userId: user.id,
    companyId: user.companyId,
    action: 'CREATE',
    entity: 'Certificate',
    entityId: cert.id,
    meta: { participantId, eventId },
  });

  return cert;
}

// ── Elegibilidade para emissão em bulk ──────────────────────────────────────

export async function calcEligible(eventId: string, threshold: number) {
  const event = await CertRepo.findEventWithParticipantsForBulk(eventId);
  if (!event) return { eligible: [], belowThresholdCount: 0, totalParticipants: 0, totalDays: 0 };

  const totalDays = event.days.length || 1;
  const eligible: typeof event.participants = [];
  const below: typeof event.participants = [];

  for (const p of event.participants) {
    const pct = (p.checkins.length / totalDays) * 100;
    (pct >= threshold ? eligible : below).push(p);
  }

  return {
    eligible,
    belowThresholdCount: below.length,
    totalParticipants: event.participants.length,
    totalDays,
  };
}

// ── Emissão em bulk ──────────────────────────────────────────────────────────

export async function bulkIssueCertificates(
  user: SessionUser,
  eventId: string,
  threshold: number,
) {
  const { eligible } = await calcEligible(eventId, threshold);

  let issued = 0;
  let alreadyHad = 0;

  for (const p of eligible) {
    const existing = await CertRepo.findExistingCertificate(p.id, eventId);
    if (existing) { alreadyHad++; continue; }
    await CertRepo.createCertificate(p.id, eventId);
    issued++;
  }

  await createAuditLog({
    userId: user.id,
    companyId: user.companyId,
    action: 'BULK_ISSUE',
    entity: 'Certificate',
    meta: { eventId, issued, alreadyHad },
  });

  return { issued, alreadyHad, total: issued + alreadyHad };
}

// ── Revogar ──────────────────────────────────────────────────────────────────

export async function deleteCertificate(user: SessionUser, id: string) {
  await CertRepo.deleteCertificateById(id);
  await createAuditLog({
    userId: user.id,
    companyId: user.companyId,
    action: 'DELETE',
    entity: 'Certificate',
    entityId: id,
  });
}
