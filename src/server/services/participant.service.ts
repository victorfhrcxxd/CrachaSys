/**
 * server/services/participant.service.ts
 * Lógica de negócio para participantes:
 * criação com QR token, conta de usuário automática e envio de e-mail.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { generateQrToken } from '../qrToken';
import { sendBadgeEmail } from '../emailService';
import { checkPlanLimit } from '../planLimits';
import { createAuditLog } from '../auditLog';
import type { SessionUser } from '../session';
import type { CreateParticipantInput } from '../validators/participant';

// ── Queries ──────────────────────────────────────────────────────────────────

const participantInclude = {
  checkins: { include: { eventDay: { select: { id: true, date: true, label: true } } } },
  certificate: true,
} as const;

export async function listParticipants(eventId?: string) {
  return prisma.participant.findMany({
    where: eventId ? { eventId } : {},
    orderBy: { name: 'asc' },
    include: participantInclude,
  });
}

// ── Criação com conta de usuário + email ─────────────────────────────────────

export interface CreateParticipantResult {
  participant: Awaited<ReturnType<typeof prisma.participant.create>>;
  accountCreated: boolean;
  generatedPassword: string | null;
}

export async function createParticipant(
  user: SessionUser,
  input: CreateParticipantInput,
): Promise<CreateParticipantResult> {
  const email = input.email.toLowerCase();
  const { name, eventId, badgeRole } = input;

  // Plan limit
  const limit = await checkPlanLimit(user.companyId, 'participants');
  if (!limit.allowed) {
    throw Object.assign(
      new Error(`Limite do plano atingido (${limit.current}/${limit.max} participantes). Faça upgrade do plano.`),
      { statusCode: 402, meta: { plan: limit.plan } },
    );
  }

  // Duplicata
  const existing = await prisma.participant.findUnique({
    where: { email_eventId: { email, eventId } },
  });
  if (existing) {
    throw Object.assign(
      new Error('Participante já cadastrado neste evento'),
      { statusCode: 409 },
    );
  }

  // Criar participante
  const id = crypto.randomUUID();
  const qrToken = generateQrToken(id, eventId);
  const participant = await prisma.participant.create({
    data: {
      id, name, email,
      company: input.company,
      badgeRole: badgeRole ?? 'Participante',
      eventId,
      qrToken,
    },
  });

  // Conta de usuário automática
  let generatedPassword: string | null = null;
  let accountCreated = false;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (!existingUser) {
    const words = ['Acesso', 'Evento', 'Cracha', 'Porta', 'Login'];
    const word = words[Math.floor(Math.random() * words.length)];
    generatedPassword = `${word}${Math.floor(1000 + Math.random() * 9000)}`;
    await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(generatedPassword, 10),
        role: 'MEMBER',
        companyId: user.companyId,
      },
    });
    accountCreated = true;
  }

  // Email de boas-vindas (fire & forget)
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true, startDate: true, location: true },
  });
  if (event) {
    sendBadgeEmail({
      to: email,
      participantName: name,
      eventName: event.name,
      eventDate: new Date(event.startDate).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      }),
      eventLocation: event.location ?? undefined,
      qrToken,
      badgeRole: badgeRole ?? 'Participante',
      loginPassword: generatedPassword ?? undefined,
      loginUrl: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
    }).catch(() => {});
  }

  await createAuditLog({
    userId: user.id,
    companyId: user.companyId,
    action: 'CREATE',
    entity: 'Participant',
    entityId: participant.id,
    meta: { name, email, eventId },
  });

  return { participant, accountCreated, generatedPassword };
}
