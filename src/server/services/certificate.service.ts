/**
 * server/services/certificate.service.ts
 * Lógica de negócio para emissão de certificados.
 */

import { prisma } from '../prisma';
import { checkPlanLimit } from '../planLimits';
import { createAuditLog } from '../auditLog';
import type { SessionUser } from '../session';

const certInclude = {
  participant: { select: { id: true, name: true, email: true, company: true } },
  event: { select: { id: true, name: true, workload: true, startDate: true, endDate: true, instructor: true } },
} as const;

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listCertificates(user: SessionUser) {
  const companyId = user.role !== 'SUPER_ADMIN' ? user.companyId : undefined;
  return prisma.certificate.findMany({
    where: companyId ? { event: { companyId } } : {},
    orderBy: { issuedAt: 'desc' },
    include: certInclude,
  });
}

export async function getCertificate(id: string) {
  return prisma.certificate.findUnique({ where: { id }, include: certInclude });
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

  const cert = await prisma.certificate.create({
    data: { participantId, eventId },
    include: certInclude,
  });

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
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      days: true,
      participants: { include: { checkins: true } },
    },
  });
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
    const existing = await prisma.certificate.findFirst({
      where: { participantId: p.id, eventId },
    });
    if (existing) { alreadyHad++; continue; }
    await prisma.certificate.create({ data: { participantId: p.id, eventId } });
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
  await prisma.certificate.delete({ where: { id } });
  await createAuditLog({
    userId: user.id,
    companyId: user.companyId,
    action: 'DELETE',
    entity: 'Certificate',
    entityId: id,
  });
}
