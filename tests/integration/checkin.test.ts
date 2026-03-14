/**
 * tests/integration/checkin.test.ts
 *
 * Tests the scanCheckin service against a real test database.
 * Covers: valid QR, invalid QR, duplicate check-in, wrong event day.
 *
 * Note: assertCheckinWindow uses the current clock.
 * All events/days are created within the checkin window (factory default).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { scanCheckin, CheckinError }  from '@/server/services/checkin.service';
import { generateQrToken }            from '@/server/qrToken';
import { cleanDb }                    from '../setup/test-db';
import { createCompany }              from '../factories/company.factory';
import { createStaff }                from '../factories/user.factory';
import { createEventWithDay }         from '../factories/event.factory';
import { createParticipant }          from '../factories/participant.factory';
import { sessionFromDbUser }          from '../helpers/auth';

beforeEach(cleanDb);

describe('scanCheckin – valid QR token', () => {
  it('creates a check-in and returns duplicate: false', async () => {
    const company     = await createCompany();
    const staffDb     = await createStaff(company.id);
    const staff       = sessionFromDbUser(staffDb, company.name);
    const { event, day } = await createEventWithDay(company.id);
    const participant = await createParticipant(event.id);

    const result = await scanCheckin(staff, {
      qrToken:    participant.qrToken,
      eventDayId: day.id,
    });

    expect(result.duplicate).toBe(false);
    expect(result.participant.id).toBe(participant.id);
    expect(result.checkIn).toBeDefined();
  });

  it('creates check-in when token is HMAC-signed via generateQrToken', async () => {
    const company     = await createCompany();
    const staffDb     = await createStaff(company.id);
    const staff       = sessionFromDbUser(staffDb, company.name);
    const { event, day } = await createEventWithDay(company.id);
    const participant = await createParticipant(event.id);

    // Use the HMAC-signed token explicitly (same value stored in DB via createParticipant)
    const signedToken = generateQrToken(participant.id, event.id);
    const result = await scanCheckin(staff, { qrToken: signedToken, eventDayId: day.id });

    expect(result.duplicate).toBe(false);
    expect(result.participant.id).toBe(participant.id);
  });

  it('stores checkedInById correctly on the check-in record', async () => {
    const company     = await createCompany();
    const staffDb     = await createStaff(company.id);
    const staff       = sessionFromDbUser(staffDb, company.name);
    const { event, day } = await createEventWithDay(company.id);
    const participant = await createParticipant(event.id);

    const result = await scanCheckin(staff, {
      qrToken:    participant.qrToken,
      eventDayId: day.id,
    });

    expect(result.checkIn?.checkedInById).toBe(staffDb.id);
  });
});

describe('scanCheckin – duplicate check-in', () => {
  it('returns duplicate: true on second scan of the same participant/day', async () => {
    const company     = await createCompany();
    const staffDb     = await createStaff(company.id);
    const staff       = sessionFromDbUser(staffDb, company.name);
    const { event, day } = await createEventWithDay(company.id);
    const participant = await createParticipant(event.id);

    await scanCheckin(staff, { qrToken: participant.qrToken, eventDayId: day.id });

    const second = await scanCheckin(staff, { qrToken: participant.qrToken, eventDayId: day.id });

    expect(second.duplicate).toBe(true);
    expect(second.message).toMatch(participant.name);
  });

  it('does NOT create a second DB record on duplicate scan', async () => {
    const company     = await createCompany();
    const staffDb     = await createStaff(company.id);
    const staff       = sessionFromDbUser(staffDb, company.name);
    const { event, day } = await createEventWithDay(company.id);
    const participant = await createParticipant(event.id);

    await scanCheckin(staff, { qrToken: participant.qrToken, eventDayId: day.id });
    await scanCheckin(staff, { qrToken: participant.qrToken, eventDayId: day.id });

    const { prisma } = await import('../setup/test-db');
    const checkins = await prisma.checkIn.findMany({ where: { participantId: participant.id } });
    expect(checkins).toHaveLength(1);
  });
});

describe('scanCheckin – invalid QR token', () => {
  it('throws CheckinError with 404 for a completely unknown token', async () => {
    const company  = await createCompany();
    const staffDb  = await createStaff(company.id);
    const staff    = sessionFromDbUser(staffDb, company.name);
    const { day }  = await createEventWithDay(company.id);

    await expect(
      scanCheckin(staff, { qrToken: 'totally-fake-token', eventDayId: day.id }),
    ).rejects.toThrow(CheckinError);

    await expect(
      scanCheckin(staff, { qrToken: 'totally-fake-token', eventDayId: day.id }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws CheckinError when eventDayId does not belong to participant\'s event', async () => {
    const company  = await createCompany();
    const staffDb  = await createStaff(company.id);
    const staff    = sessionFromDbUser(staffDb, company.name);

    const { event: evtA, day: dayA } = await createEventWithDay(company.id);
    const { day: dayB }              = await createEventWithDay(company.id);
    const participant                = await createParticipant(evtA.id);

    // dayB belongs to a different event than participant
    await expect(
      scanCheckin(staff, { qrToken: participant.qrToken, eventDayId: dayB.id }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws CheckinError when eventDayId does not exist', async () => {
    const company     = await createCompany();
    const staffDb     = await createStaff(company.id);
    const staff       = sessionFromDbUser(staffDb, company.name);
    const { event }   = await createEventWithDay(company.id);
    const participant = await createParticipant(event.id);

    await expect(
      scanCheckin(staff, { qrToken: participant.qrToken, eventDayId: 'non-existent-day-id' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('scanCheckin – checkin window', () => {
  it('throws when event has not started yet', async () => {
    const company  = await createCompany();
    const staffDb  = await createStaff(company.id);
    const staff    = sessionFromDbUser(staffDb, company.name);

    const future = new Date(Date.now() + 5 * 3_600_000);
    const { event, day } = await createEventWithDay(company.id, {
      startDate:            future,
      endDate:              new Date(future.getTime() + 3_600_000),
      checkinWindowMinutes: 10,
    });
    const participant = await createParticipant(event.id);

    await expect(
      scanCheckin(staff, { qrToken: participant.qrToken, eventDayId: day.id }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws when event has already ended', async () => {
    const company  = await createCompany();
    const staffDb  = await createStaff(company.id);
    const staff    = sessionFromDbUser(staffDb, company.name);

    const past = new Date(Date.now() - 10 * 3_600_000);
    const { event, day } = await createEventWithDay(company.id, {
      startDate: new Date(past.getTime() - 3_600_000),
      endDate:   past,
      checkinWindowMinutes: 10,
    });
    const participant = await createParticipant(event.id);

    await expect(
      scanCheckin(staff, { qrToken: participant.qrToken, eventDayId: day.id }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
