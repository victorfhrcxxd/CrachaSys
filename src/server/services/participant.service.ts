/**
 * server/services/participant.service.ts
 * Lógica de negócio para participantes:
 * criação com QR token, conta de usuário automática e envio de e-mail.
 */

import bcrypt from 'bcryptjs';
import { sendBadgeEmail } from '../emailService';
import { checkPlanLimit } from '../planLimits';
import { createAuditLog } from '../auditLog';
import type { SessionUser } from '../session';
import type { CreateParticipantInput, ImportParticipantRow } from '../validators/participant.validator';
import * as ParticipantRepo from '../repositories/participants/participant.repository';

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listParticipants(user: SessionUser, eventId?: string) {
  if (!eventId) return [];
  return ParticipantRepo.findParticipantsByEvent(eventId);
}

// ── Geração de senha temporária ───────────────────────────────────────────────

function generateTempPassword(): string {
  const words = ['Acesso', 'Evento', 'Cracha', 'Porta', 'Login'];
  const word = words[Math.floor(Math.random() * words.length)];
  return `${word}${Math.floor(1000 + Math.random() * 9000)}`;
}

// ── Criação de conta de usuário automática ────────────────────────────────────

async function maybeCreateUserAccount(
  name: string,
  email: string,
  companyId: string,
): Promise<{ accountCreated: boolean; generatedPassword: string | null }> {
  const existing = await ParticipantRepo.findUserByEmail(email);
  if (existing) return { accountCreated: false, generatedPassword: null };

  const generatedPassword = generateTempPassword();
  await ParticipantRepo.createUserAccount({
    name,
    email,
    hashedPassword: await bcrypt.hash(generatedPassword, 10),
    companyId,
  });
  return { accountCreated: true, generatedPassword };
}

// ── Criação individual ────────────────────────────────────────────────────────

export interface CreateParticipantResult {
  participant: Awaited<ReturnType<typeof ParticipantRepo.createParticipant>>;
  accountCreated: boolean;
  generatedPassword: string | null;
}

export async function createParticipant(
  user: SessionUser,
  input: CreateParticipantInput,
): Promise<CreateParticipantResult> {
  const email = input.email.toLowerCase();
  const { name, eventId, badgeRole } = input;

  const limit = await checkPlanLimit(user.companyId, 'participants');
  if (!limit.allowed) {
    throw Object.assign(
      new Error(`Limite do plano atingido (${limit.current}/${limit.max} participantes). Faça upgrade do plano.`),
      { statusCode: 402, meta: { plan: limit.plan } },
    );
  }

  const existing = await ParticipantRepo.findParticipantByEmailAndEvent(email, eventId);
  if (existing) {
    throw Object.assign(new Error('Participante já cadastrado neste evento'), { statusCode: 409 });
  }

  const participant = await ParticipantRepo.createParticipant({
    name, email, eventId,
    company:   input.company   ?? null,
    document:  input.document  ?? null,
    phone:     input.phone     ?? null,
    photo:     input.photo     ?? null,
    badgeRole: badgeRole ?? 'Participante',
  });

  const { accountCreated, generatedPassword } = await maybeCreateUserAccount(name, email, user.companyId);

  const event = await ParticipantRepo.findEventForEmail(eventId);
  if (event) {
    sendBadgeEmail({
      to: email,
      participantName: name,
      eventName: event.name,
      eventDate: new Date(event.startDate).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      }),
      eventLocation: event.location ?? undefined,
      qrToken: participant.qrToken,
      badgeRole: badgeRole ?? 'Participante',
      loginPassword: generatedPassword ?? undefined,
      loginUrl: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
    }).catch(() => {});
  }

  await createAuditLog({
    userId: user.id, companyId: user.companyId,
    action: 'CREATE', entity: 'Participant', entityId: participant.id,
    meta: { name, email, eventId },
  });

  return { participant, accountCreated, generatedPassword };
}

// ── Importação em lote ────────────────────────────────────────────────────────

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

export async function importParticipants(
  eventId: string,
  rows: ImportParticipantRow[],
): Promise<ImportResult> {
  const seen = new Set<string>();
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const email = row.email.toLowerCase();

    if (seen.has(email)) { skipped++; continue; }
    seen.add(email);

    const existing = await ParticipantRepo.findParticipantByEmailAndEvent(email, eventId);
    if (existing) { skipped++; continue; }

    try {
      await ParticipantRepo.createParticipant({
        name:      row.name,
        email,
        company:   row.company   ?? null,
        document:  row.document  ?? null,
        phone:     row.phone     ?? null,
        photo:     null,
        badgeRole: row.badgeRole ?? 'Participante',
        eventId,
      });
      created++;
    } catch (e) {
      errors.push(`${email}: ${String(e)}`);
    }
  }

  return { created, skipped, errors };
}
