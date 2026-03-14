/**
 * server/repositories/event.repository.ts
 * Acesso ao banco isolado para o domínio de Eventos.
 * Nenhuma regra de negócio aqui — apenas queries Prisma.
 */

import { prisma } from '../prisma';
import type { CreateEventInput, UpdateEventInput } from '../validators/event';

// include: aceita SOMENTE relações — escalares vêm automaticamente
const eventInclude = {
  days: { orderBy: { date: 'asc' } as const },
  attendanceRule: true,
  _count: { select: { participants: true, certificates: true } },
} as const;

// ── Queries ──────────────────────────────────────────────────────────────────

export async function findEventsByCompany(companyId: string) {
  return prisma.event.findMany({
    where: { companyId },
    orderBy: { startDate: 'desc' },
    include: eventInclude,
  });
}

export async function findAllEvents() {
  return prisma.event.findMany({
    orderBy: { startDate: 'desc' },
    include: eventInclude,
  });
}

export async function findEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      days: { orderBy: { date: 'asc' } as const },
      attendanceRule: true,
      participants: {
        orderBy: { name: 'asc' as const },
        include: {
          checkins: { include: { eventDay: true } },
          certificate: true,
        },
      },
      _count: { select: { participants: true, certificates: true } },
    },
  });
}

export async function countEventsByCompany(companyId: string): Promise<number> {
  return prisma.event.count({ where: { companyId } });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createEvent(
  companyId: string,
  data: CreateEventInput,
) {
  return prisma.event.create({
    data: {
      name: data.name,
      description: data.description,
      location: data.location,
      address: data.address,
      city: data.city,
      instructor: data.instructor,
      workload: data.workload ?? null,
      capacity: data.capacity ?? null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      checkinWindowMinutes: data.checkinWindowMinutes ?? 60,
      companyId,
      days: data.days?.length

        ? { create: data.days.map((d) => ({ date: new Date(d.date), label: d.label })) }
        : undefined,
      attendanceRule: data.attendanceRule
        ? { create: { ruleType: data.attendanceRule.ruleType, minDays: data.attendanceRule.minDays ?? null } }
        : undefined,
    },
    include: { days: true, attendanceRule: true },
  });
}

export async function updateEvent(id: string, data: UpdateEventInput) {
  return prisma.event.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      location: data.location,
      address: data.address,
      city: data.city,
      instructor: data.instructor,
      workload: data.workload ?? null,
      capacity: data.capacity ?? null,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      checkinWindowMinutes: data.checkinWindowMinutes,
      status: data.status,
    },
  });
}

export async function syncEventDays(
  eventId: string,
  days: { id?: string; date: string; label?: string }[],
) {
  const incomingIds = days.filter((d) => d.id).map((d) => d.id as string);

  await prisma.eventDay.deleteMany({
    where: { eventId, ...(incomingIds.length ? { id: { notIn: incomingIds } } : {}) },
  });

  for (const day of days) {
    if (day.id) {
      await prisma.eventDay.update({
        where: { id: day.id },
        data: { date: new Date(day.date), label: day.label },
      });
    } else {
      await prisma.eventDay.create({
        data: { eventId, date: new Date(day.date), label: day.label },
      });
    }
  }
}

export async function upsertAttendanceRule(
  eventId: string,
  rule: { ruleType: string; minDays?: number | null },
) {
  return prisma.attendanceRule.upsert({
    where: { eventId },
    update: { ruleType: rule.ruleType, minDays: rule.minDays ?? null },
    create: { eventId, ruleType: rule.ruleType, minDays: rule.minDays ?? null },
  });
}

export async function deleteEvent(id: string) {
  return prisma.event.delete({ where: { id } });
}
