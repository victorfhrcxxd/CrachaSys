/**
 * server/repositories/certificates/certificate.repository.ts
 * Prisma access for the certificate domain. No business logic here.
 */

import { prisma } from '../../prisma';

const certInclude = {
  participant: { select: { id: true, name: true, email: true, company: true } },
  event: { select: { id: true, name: true, workload: true, startDate: true, endDate: true, instructor: true } },
} as const;

export async function findCertificatesByCompany(companyId: string) {
  return prisma.certificate.findMany({
    where: { event: { companyId } },
    orderBy: { issuedAt: 'desc' },
    include: certInclude,
  });
}

export async function findAllCertificates() {
  return prisma.certificate.findMany({
    orderBy: { issuedAt: 'desc' },
    include: certInclude,
  });
}

export async function findCertificateById(id: string) {
  return prisma.certificate.findUnique({ where: { id }, include: certInclude });
}

export async function findCertificateByCode(verificationCode: string) {
  return prisma.certificate.findUnique({
    where: { verificationCode },
    include: certInclude,
  });
}

export async function findExistingCertificate(participantId: string, eventId: string) {
  return prisma.certificate.findFirst({ where: { participantId, eventId } });
}

export async function createCertificate(participantId: string, eventId: string) {
  return prisma.certificate.create({
    data: { participantId, eventId },
    include: certInclude,
  });
}

export async function deleteCertificateById(id: string) {
  return prisma.certificate.delete({ where: { id } });
}

export async function findEventWithParticipantsForBulk(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: {
      days: true,
      participants: { include: { checkins: true } },
    },
  });
}
