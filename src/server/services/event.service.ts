/**
 * server/services/event.service.ts
 * Lógica de negócio para o domínio de Eventos.
 * Orquestra repository + planLimits + auditLog.
 */

import { checkPlanLimit } from '../planLimits';
import { createAuditLog } from '../auditLog';
import { paymentRequired as planError } from '../response';
import { prisma } from '../prisma';
import type { SessionUser } from '../session';
import type { CreateEventInput, UpdateEventInput, ImportFullEventInput } from '../validators/event';
import * as EventRepo from '../repositories/event.repository';
import * as ParticipantRepo from '../repositories/participants/participant.repository';

// Re-exporta para facilitar imports nas rotas
export { EventRepo };

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listEvents(user: SessionUser) {
  if (user.role === 'SUPER_ADMIN') return EventRepo.findAllEvents();
  return EventRepo.findEventsByCompany(user.companyId);
}

export async function getEvent(id: string) {
  return EventRepo.findEventById(id);
}

// ── Mutations ────────────────────────────────────────────────────────────────

export interface CreateEventResult {
  planError?: { message: string; meta: unknown };
  event?: Awaited<ReturnType<typeof EventRepo.createEvent>>;
}

export async function createEvent(
  user: SessionUser,
  input: CreateEventInput,
): Promise<CreateEventResult> {
  const limit = await checkPlanLimit(user.companyId, 'events');
  if (!limit.allowed) {
    return {
      planError: {
        message: `Limite do plano atingido (${limit.current}/${limit.max} eventos). Faça upgrade do plano.`,
        meta: { plan: limit.plan },
      },
    };
  }

  const event = await EventRepo.createEvent(user.companyId, input);
  await createAuditLog({
    userId: user.id,
    companyId: user.companyId,
    action: 'CREATE',
    entity: 'Event',
    entityId: event.id,
    meta: { name: event.name },
  });

  return { event };
}

export async function updateEvent(
  user: SessionUser,
  id: string,
  input: UpdateEventInput,
) {
  const event = await EventRepo.updateEvent(id, input);

  if (input.days !== undefined) {
    await EventRepo.syncEventDays(id, input.days as { id?: string; date: string; label?: string }[]);
  }
  if (input.attendanceRule) {
    await EventRepo.upsertAttendanceRule(id, input.attendanceRule);
  }

  await createAuditLog({
    userId: user.id,
    companyId: user.companyId,
    action: 'UPDATE',
    entity: 'Event',
    entityId: id,
    meta: { name: event.name },
  });

  return EventRepo.findEventById(id);
}

export async function deleteEvent(user: SessionUser, id: string) {
  await EventRepo.deleteEvent(id);
  await createAuditLog({
    userId: user.id,
    companyId: user.companyId,
    action: 'DELETE',
    entity: 'Event',
    entityId: id,
  });
}

// Dummy export to satisfy unused import check in response.ts usage
export { planError };

// ── Importação completa (evento + participantes + templates) ─────────────────

export interface ImportFullResult {
  eventId:   string;
  eventName: string;
  created:   number;
  skipped:   number;
  errors:    string[];
}

export async function importFullEvent(
  user: SessionUser,
  input: ImportFullEventInput,
): Promise<ImportFullResult> {
  const limit = await checkPlanLimit(user.companyId, 'events');
  if (!limit.allowed) {
    throw Object.assign(
      new Error(`Limite do plano atingido (${limit.current}/${limit.max} eventos).`),
      { statusCode: 402 },
    );
  }

  const event = await EventRepo.createEvent(user.companyId, input.event);

  if (input.badgeTemplateUrl) {
    await prisma.badgeTemplate.create({
      data: { name: 'Template Importado', fileUrl: input.badgeTemplateUrl, eventId: event.id, isDefault: true },
    });
  }
  if (input.certificateTemplateUrl) {
    await prisma.certificateTemplate.create({
      data: { name: 'Certificado Importado', fileUrl: input.certificateTemplateUrl, eventId: event.id, isDefault: true },
    });
  }

  const seen = new Set<string>();
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of (input.participants ?? [])) {
    const email = row.email.toLowerCase().trim();
    const name  = row.name.replace(/^\d+\.\s*/, '').trim();

    if (!name || !email) { errors.push(`Linha inválida: ${JSON.stringify(row)}`); continue; }
    if (seen.has(email)) { skipped++; continue; }
    seen.add(email);

    const existing = await ParticipantRepo.findParticipantByEmailAndEvent(email, event.id);
    if (existing) { skipped++; continue; }

    try {
      await ParticipantRepo.createParticipant({
        name,
        email,
        company:   row.company  ?? null,
        document:  row.document ?? null,
        phone:     row.phone    ?? null,
        photo:     null,
        badgeRole: row.badgeRole ?? 'Participante',
        eventId:   event.id,
      });
      created++;
    } catch (e) {
      errors.push(`${email}: ${String(e)}`);
    }
  }

  await createAuditLog({
    userId: user.id, companyId: user.companyId,
    action: 'IMPORT', entity: 'Event', entityId: event.id,
    meta: { name: event.name, created, skipped },
  });

  return { eventId: event.id, eventName: event.name, created, skipped, errors };
}
