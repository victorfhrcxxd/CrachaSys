/**
 * server/repositories/participants/participant.repository.ts
 * Prisma access for the participant domain. No business logic here.
 */

import crypto from 'crypto';
import { prisma } from '../../prisma';
import { generateQrToken } from '../../qrToken';

const participantInclude = {
  checkins: { include: { eventDay: { select: { id: true, date: true, label: true } } } },
  certificate: true,
} as const;

// ── Queries ──────────────────────────────────────────────────────────────────

export async function findParticipantsByEvent(eventId: string) {
  return prisma.participant.findMany({
    where: { eventId },
    orderBy: { name: 'asc' },
    include: participantInclude,
  });
}

export async function findParticipantById(id: string) {
  return prisma.participant.findUnique({
    where: { id },
    include: participantInclude,
  });
}

export async function findParticipantByEmailAndEvent(email: string, eventId: string) {
  return prisma.participant.findUnique({
    where: { email_eventId: { email, eventId } },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export interface CreateParticipantData {
  name: string;
  email: string;
  company?: string | null;
  document?: string | null;
  phone?: string | null;
  photo?: string | null;
  badgeRole: string;
  eventId: string;
}

export async function createParticipant(data: CreateParticipantData) {
  const id = crypto.randomUUID();
  const qrToken = generateQrToken(id, data.eventId);

  return prisma.participant.create({
    data: {
      id,
      qrToken,
      name:      data.name,
      email:     data.email,
      company:   data.company   ?? null,
      document:  data.document  ?? null,
      phone:     data.phone     ?? null,
      photo:     data.photo     ?? null,
      badgeRole: data.badgeRole,
      eventId:   data.eventId,
    },
  });
}

export interface CreateUserData {
  name: string;
  email: string;
  hashedPassword: string;
  companyId: string;
}

export async function createUserAccount(data: CreateUserData) {
  return prisma.user.create({
    data: {
      name:      data.name,
      email:     data.email,
      password:  data.hashedPassword,
      role:      'MEMBER',
      companyId: data.companyId,
    },
  });
}

export async function findEventForEmail(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true, startDate: true, location: true },
  });
}
