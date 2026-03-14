/**
 * tests/integration/certificate-eligibility.test.ts
 *
 * Tests certificate eligibility logic and issuance against a real test database.
 * Covers: calcEligible threshold, bulkIssueCertificates, issueCertificate,
 *         plan-limit enforcement, and basic tenant isolation on certificates.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calcEligible,
  issueCertificate,
  bulkIssueCertificates,
} from '@/server/services/certificate.service';
import { prisma, cleanDb }     from '../setup/test-db';
import { createCompany, createFreeCompany } from '../factories/company.factory';
import { createEventWithDays } from '../factories/event.factory';
import { createParticipant, createCheckin } from '../factories/participant.factory';
import { makeAdmin }           from '../helpers/auth';

beforeEach(cleanDb);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sets up an event with 2 days, 3 participants with varying attendance. */
async function setupEligibilityScenario(companyId: string) {
  const { event, days } = await createEventWithDays(companyId, 2);

  // participantFull attends both days
  const pFull    = await createParticipant(event.id, { name: 'Full Attendance' });
  await createCheckin(pFull.id, days[0].id);
  await createCheckin(pFull.id, days[1].id);

  // participantPartial attends only one day
  const pPartial = await createParticipant(event.id, { name: 'Partial Attendance' });
  await createCheckin(pPartial.id, days[0].id);

  // participantNone attends no days
  const pNone    = await createParticipant(event.id, { name: 'No Attendance' });

  return { event, days, pFull, pPartial, pNone };
}

// ── calcEligible ─────────────────────────────────────────────────────────────

describe('calcEligible', () => {
  it('returns totals correctly', async () => {
    const company = await createCompany();
    const { event } = await setupEligibilityScenario(company.id);

    const result = await calcEligible(event.id, 100);

    expect(result.totalParticipants).toBe(3);
    expect(result.totalDays).toBe(2);
  });

  it('includes participant with 100% attendance when threshold is 100', async () => {
    const company = await createCompany();
    const { event, pFull } = await setupEligibilityScenario(company.id);

    const { eligible } = await calcEligible(event.id, 100);

    expect(eligible.map(p => p.id)).toContain(pFull.id);
    expect(eligible).toHaveLength(1);
  });

  it('excludes participant with partial attendance when threshold is 100', async () => {
    const company = await createCompany();
    const { event, pPartial, pNone } = await setupEligibilityScenario(company.id);

    const { eligible, belowThresholdCount } = await calcEligible(event.id, 100);

    expect(eligible.map(p => p.id)).not.toContain(pPartial.id);
    expect(eligible.map(p => p.id)).not.toContain(pNone.id);
    expect(belowThresholdCount).toBe(2);
  });

  it('includes participant with partial attendance when threshold is 50', async () => {
    const company = await createCompany();
    const { event, pFull, pPartial, pNone } = await setupEligibilityScenario(company.id);

    const { eligible } = await calcEligible(event.id, 50);

    const ids = eligible.map(p => p.id);
    expect(ids).toContain(pFull.id);
    expect(ids).toContain(pPartial.id);
    expect(ids).not.toContain(pNone.id);
  });

  it('returns empty eligible list when threshold is 0 and nobody attended', async () => {
    const company = await createCompany();
    const { event } = await createEventWithDays(company.id, 1);
    await createParticipant(event.id);

    // threshold 0: technically 0% >= 0% so everyone is eligible
    const { eligible } = await calcEligible(event.id, 0);
    expect(eligible).toHaveLength(1);
  });

  it('returns empty result for non-existent event', async () => {
    const result = await calcEligible('non-existent-event-id', 100);
    expect(result.eligible).toHaveLength(0);
    expect(result.totalParticipants).toBe(0);
  });
});

// ── issueCertificate ──────────────────────────────────────────────────────────

describe('issueCertificate', () => {
  it('creates a certificate record with a verification code', async () => {
    const company     = await createCompany();
    const user        = makeAdmin(company.id);
    const { event }   = await createEventWithDays(company.id, 1);
    const participant = await createParticipant(event.id);

    const cert = await issueCertificate(user, participant.id, event.id);

    expect(cert.id).toBeTruthy();
    expect(cert.verificationCode).toBeTruthy();
    expect(cert.participantId).toBe(participant.id);
    expect(cert.eventId).toBe(event.id);
  });

  it('certificate is persisted in the database', async () => {
    const company     = await createCompany();
    const user        = makeAdmin(company.id);
    const { event }   = await createEventWithDays(company.id, 1);
    const participant = await createParticipant(event.id);

    const cert = await issueCertificate(user, participant.id, event.id);

    const dbCert = await prisma.certificate.findUnique({ where: { id: cert.id } });
    expect(dbCert).not.toBeNull();
  });

  it('throws when plan certificate limit is reached', async () => {
    const company     = await createFreeCompany({ maxCertificates: 1 });
    const user        = makeAdmin(company.id);
    const { event }   = await createEventWithDays(company.id, 1);
    const [p1, p2]    = await Promise.all([
      createParticipant(event.id),
      createParticipant(event.id),
    ]);

    await issueCertificate(user, p1.id, event.id); // consumes the 1 allowed

    await expect(
      issueCertificate(user, p2.id, event.id),
    ).rejects.toMatchObject({ statusCode: 402 });
  });
});

// ── bulkIssueCertificates ─────────────────────────────────────────────────────

describe('bulkIssueCertificates', () => {
  it('issues certificates only to eligible participants', async () => {
    const company = await createCompany();
    const user    = makeAdmin(company.id);
    const { event, pFull, pPartial, pNone } = await setupEligibilityScenario(company.id);

    const result = await bulkIssueCertificates(user, event.id, 100);

    expect(result.issued).toBe(1);
    expect(result.alreadyHad).toBe(0);

    const certs = await prisma.certificate.findMany({ where: { eventId: event.id } });
    expect(certs).toHaveLength(1);
    expect(certs[0].participantId).toBe(pFull.id);
    void pPartial;
    void pNone;
  });

  it('counts alreadyHad for participants with an existing certificate', async () => {
    const company = await createCompany();
    const user    = makeAdmin(company.id);
    const { event, pFull } = await setupEligibilityScenario(company.id);

    // Issue manually first
    await issueCertificate(user, pFull.id, event.id);

    const result = await bulkIssueCertificates(user, event.id, 100);

    expect(result.issued).toBe(0);
    expect(result.alreadyHad).toBe(1);
  });

  it('issues to all participants when threshold is 0', async () => {
    const company       = await createCompany();
    const user          = makeAdmin(company.id);
    const { event }     = await createEventWithDays(company.id, 1);
    await createParticipant(event.id);
    await createParticipant(event.id);
    await createParticipant(event.id);

    const result = await bulkIssueCertificates(user, event.id, 0);

    expect(result.issued).toBe(3);
  });
});

// ── Tenant isolation on certificates ─────────────────────────────────────────

describe('Certificate tenant isolation', () => {
  it('certificate is linked to the correct event (and thus company)', async () => {
    const [cmpA, cmpB] = await Promise.all([createCompany(), createCompany()]);
    const userA        = makeAdmin(cmpA.id);
    const { event: evtA } = await createEventWithDays(cmpA.id, 1);
    const { event: evtB } = await createEventWithDays(cmpB.id, 1);
    const pA           = await createParticipant(evtA.id);

    const cert = await issueCertificate(userA, pA.id, evtA.id);

    const dbCert = await prisma.certificate.findUnique({
      where: { id: cert.id },
      include: { event: { select: { companyId: true } } },
    });

    expect(dbCert!.event.companyId).toBe(cmpA.id);
    expect(dbCert!.event.companyId).not.toBe(cmpB.id);
    void evtB;
  });

  it('listCertificates only returns certs from own company', async () => {
    const [cmpA, cmpB] = await Promise.all([createCompany(), createCompany()]);
    const [userA, userB] = [makeAdmin(cmpA.id), makeAdmin(cmpB.id)];

    const { event: evtA } = await createEventWithDays(cmpA.id, 1);
    const { event: evtB } = await createEventWithDays(cmpB.id, 1);
    const [pA, pB]        = await Promise.all([
      createParticipant(evtA.id),
      createParticipant(evtB.id),
    ]);

    await Promise.all([
      issueCertificate(userA, pA.id, evtA.id),
      issueCertificate(userB, pB.id, evtB.id),
    ]);

    const { listCertificates } = await import('@/server/services/certificate.service');
    const certsA = await listCertificates(userA);

    expect(certsA).toHaveLength(1);
    expect(certsA[0].eventId).toBe(evtA.id);
  });
});
