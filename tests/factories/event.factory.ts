import { prisma } from '../setup/test-db';

let seq = 0;
const uid = () => `${++seq}-${Date.now()}`;

export interface EventOverrides {
  name?:                string;
  startDate?:           Date;
  endDate?:             Date;
  checkinWindowMinutes?: number;
  status?:              string;
  workload?:            number;
}

/** Creates an event that is currently running (safe for check-in window checks). */
export async function createEvent(companyId: string, overrides: EventOverrides = {}) {
  const now = new Date();
  return prisma.event.create({
    data: {
      name:                overrides.name                ?? `Event ${uid()}`,
      startDate:           overrides.startDate           ?? new Date(now.getTime() - 2 * 3_600_000),
      endDate:             overrides.endDate             ?? new Date(now.getTime() + 2 * 3_600_000),
      checkinWindowMinutes: overrides.checkinWindowMinutes ?? 120,
      status:              overrides.status              ?? 'ONGOING',
      workload:            overrides.workload,
      companyId,
    },
  });
}

/** Creates a single event day set to "right now" (inside checkin window). */
export async function createEventDay(eventId: string, overrides: { date?: Date; label?: string } = {}) {
  const now = new Date();
  return prisma.eventDay.create({
    data: {
      eventId,
      date:  overrides.date  ?? new Date(now.getTime() - 60 * 60_000),
      label: overrides.label ?? 'Dia 1',
    },
  });
}

/** Creates an event + one event day. Convenience for most test scenarios. */
export async function createEventWithDay(companyId: string, overrides: EventOverrides = {}) {
  const event = await createEvent(companyId, overrides);
  const day   = await createEventDay(event.id);
  return { event, day };
}

/** Creates an event with N days (each 1 day apart, all in the past). */
export async function createEventWithDays(companyId: string, dayCount: number) {
  const now   = new Date();
  const event = await createEvent(companyId, {
    startDate: new Date(now.getTime() - dayCount * 24 * 3_600_000),
    endDate:   new Date(now.getTime() + 2 * 3_600_000),
    checkinWindowMinutes: 999_999,
  });

  const days = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    days.push(
      await createEventDay(event.id, {
        date:  new Date(now.getTime() - i * 24 * 3_600_000),
        label: `Dia ${dayCount - i}`,
      }),
    );
  }
  return { event, days };
}

/** Creates an AttendanceRule for an event. */
export async function createAttendanceRule(
  eventId: string,
  ruleType: 'ALL_DAYS' | 'MIN_DAYS' | 'ANY_DAY' = 'ALL_DAYS',
  minDays?: number,
) {
  return prisma.attendanceRule.create({ data: { eventId, ruleType, minDays: minDays ?? null } });
}
