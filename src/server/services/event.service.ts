/**
 * server/services/event.service.ts
 * Lógica de negócio para o domínio de Eventos.
 * Orquestra repository + planLimits + auditLog.
 */

import { checkPlanLimit } from '../planLimits';
import { createAuditLog } from '../auditLog';
import { paymentRequired as planError } from '../response';
import type { SessionUser } from '../session';
import type { CreateEventInput, UpdateEventInput } from '../validators/event';
import * as EventRepo from '../repositories/event.repository';

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
