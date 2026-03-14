/**
 * tests/integration/tenant-isolation.test.ts
 *
 * Covers multi-tenant security at three levels:
 *  1. Policy unit tests  – no DB required
 *  2. Data-layer tests   – real DB, tenant-scoped Prisma queries
 *  3. Service-assertion  – cross-tenant access attempt on real data
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ForbiddenError }       from '@/server/session';
import { assertCompanyAccess }  from '@/server/policies/access';
import {
  assertSameTenant,
  tenantWhere,
  eventTenantWhere,
  isSuperAdmin,
  requireCompanyId,
} from '@/server/policies/company-scope';
import { prisma, cleanDb } from '../setup/test-db';
import { createCompany }    from '../factories/company.factory';
import { createAdmin }      from '../factories/user.factory';
import { createEvent }      from '../factories/event.factory';
import { createParticipant } from '../factories/participant.factory';
import { makeAdmin, makeSuperAdmin, makeSessionUser, sessionFromDbUser } from '../helpers/auth';

beforeEach(cleanDb);

// ── 1. Policy unit tests ─────────────────────────────────────────────────────

describe('assertCompanyAccess', () => {
  it('allows when user and resource share the same companyId', () => {
    const user = makeAdmin('cmp-a');
    expect(() => assertCompanyAccess(user, 'cmp-a')).not.toThrow();
  });

  it('throws ForbiddenError on cross-tenant access', () => {
    const user = makeAdmin('cmp-a');
    expect(() => assertCompanyAccess(user, 'cmp-b')).toThrow(ForbiddenError);
  });

  it('SUPER_ADMIN bypasses the tenant check entirely', () => {
    const sa = makeSuperAdmin();
    expect(() => assertCompanyAccess(sa, 'any-other-company')).not.toThrow();
  });
});

describe('assertSameTenant (company-scope.ts)', () => {
  it('passes for same company', () => {
    const user = makeAdmin('cmp-a');
    expect(() => assertSameTenant(user, 'cmp-a')).not.toThrow();
  });

  it('throws ForbiddenError for different company', () => {
    const user = makeAdmin('cmp-a');
    expect(() => assertSameTenant(user, 'cmp-b')).toThrow(ForbiddenError);
  });

  it('SUPER_ADMIN bypasses', () => {
    expect(() => assertSameTenant(makeSuperAdmin(), 'random-company')).not.toThrow();
  });
});

describe('tenantWhere', () => {
  it('returns { companyId } for a regular admin', () => {
    const user = makeAdmin('cmp-x');
    expect(tenantWhere(user)).toEqual({ companyId: 'cmp-x' });
  });

  it('returns {} for SUPER_ADMIN (sees all)', () => {
    expect(tenantWhere(makeSuperAdmin())).toEqual({});
  });
});

describe('eventTenantWhere', () => {
  it('returns nested event.companyId filter for a regular user', () => {
    const user = makeAdmin('cmp-x');
    expect(eventTenantWhere(user)).toEqual({ event: { companyId: 'cmp-x' } });
  });

  it('returns {} for SUPER_ADMIN', () => {
    expect(eventTenantWhere(makeSuperAdmin())).toEqual({});
  });
});

describe('isSuperAdmin', () => {
  it('returns true for SUPER_ADMIN', () => {
    expect(isSuperAdmin(makeSuperAdmin())).toBe(true);
  });

  it('returns false for ADMIN', () => {
    expect(isSuperAdmin(makeAdmin('cmp-a'))).toBe(false);
  });

  it('returns false for MEMBER', () => {
    expect(isSuperAdmin(makeSessionUser({ role: 'MEMBER', companyId: 'cmp-a' }))).toBe(false);
  });
});

describe('requireCompanyId', () => {
  it('returns companyId when present', () => {
    const user = makeAdmin('cmp-a');
    expect(requireCompanyId(user)).toBe('cmp-a');
  });

  it('throws when companyId is empty', () => {
    const user = makeAdmin('');
    expect(() => requireCompanyId(user)).toThrow();
  });
});

// ── 2. Data-layer tenant isolation ───────────────────────────────────────────

describe('Event query isolation', () => {
  it('tenantWhere filters events to own company', async () => {
    const [cmpA, cmpB] = await Promise.all([createCompany(), createCompany()]);

    await Promise.all([
      createEvent(cmpA.id, { name: 'Event A' }),
      createEvent(cmpA.id, { name: 'Event A2' }),
      createEvent(cmpB.id, { name: 'Event B' }),
    ]);

    const adminA = makeAdmin(cmpA.id);
    const results = await prisma.event.findMany({ where: tenantWhere(adminA) });

    expect(results).toHaveLength(2);
    expect(results.every(e => e.companyId === cmpA.id)).toBe(true);
  });

  it('SUPER_ADMIN tenantWhere returns all events', async () => {
    const [cmpA, cmpB] = await Promise.all([createCompany(), createCompany()]);
    await Promise.all([createEvent(cmpA.id), createEvent(cmpB.id), createEvent(cmpB.id)]);

    const sa = makeSuperAdmin(cmpA.id);
    const results = await prisma.event.findMany({ where: tenantWhere(sa) });
    expect(results).toHaveLength(3);
  });
});

describe('Member list isolation', () => {
  it('tenantWhere on user query only returns users from own company', async () => {
    const [cmpA, cmpB] = await Promise.all([createCompany(), createCompany()]);
    await Promise.all([createAdmin(cmpA.id), createAdmin(cmpA.id), createAdmin(cmpB.id)]);

    const adminA = makeAdmin(cmpA.id);
    const users  = await prisma.user.findMany({ where: tenantWhere(adminA) });

    expect(users).toHaveLength(2);
    expect(users.every(u => u.companyId === cmpA.id)).toBe(true);
  });
});

describe('Participant query isolation via eventTenantWhere', () => {
  it('eventTenantWhere filters participants to events of own company', async () => {
    const [cmpA, cmpB] = await Promise.all([createCompany(), createCompany()]);
    const evtA = await createEvent(cmpA.id);
    const evtB = await createEvent(cmpB.id);

    await Promise.all([createParticipant(evtA.id), createParticipant(evtB.id)]);

    const adminA   = makeAdmin(cmpA.id);
    const results  = await prisma.participant.findMany({
      where: eventTenantWhere(adminA),
      include: { event: { select: { companyId: true } } },
    });

    expect(results).toHaveLength(1);
    expect(results[0].event.companyId).toBe(cmpA.id);
  });
});

// ── 3. Service-level assertions on real DB data ──────────────────────────────

describe('Cross-tenant access attempt on real event data', () => {
  it('admin from company A cannot access event from company B (assertCompanyAccess)', async () => {
    const [cmpA, cmpB] = await Promise.all([createCompany(), createCompany()]);
    const adminA = makeAdmin(cmpA.id);
    const eventB = await createEvent(cmpB.id);

    const dbEvent = await prisma.event.findUnique({
      where: { id: eventB.id },
      select: { companyId: true },
    });

    expect(dbEvent).not.toBeNull();
    expect(() => assertCompanyAccess(adminA, dbEvent!.companyId)).toThrow(ForbiddenError);
  });

  it('admin from company A can access their own event', async () => {
    const cmpA   = await createCompany();
    const adminA = makeAdmin(cmpA.id);
    const eventA = await createEvent(cmpA.id);

    const dbEvent = await prisma.event.findUnique({
      where: { id: eventA.id },
      select: { companyId: true },
    });

    expect(() => assertCompanyAccess(adminA, dbEvent!.companyId)).not.toThrow();
  });
});

describe('Cross-tenant user modification attempt', () => {
  it('admin from company A cannot modify a user from company B', async () => {
    const [cmpA, cmpB] = await Promise.all([createCompany(), createCompany()]);
    const [adminA, userB] = await Promise.all([createAdmin(cmpA.id), createAdmin(cmpB.id)]);

    const sessionA = sessionFromDbUser(adminA, cmpA.name);

    expect(() => assertSameTenant(sessionA, userB.companyId!)).toThrow(ForbiddenError);
  });

  it('admin modifying own company user passes the check', async () => {
    const cmpA   = await createCompany();
    const [adminA, userA] = await Promise.all([createAdmin(cmpA.id), createAdmin(cmpA.id)]);

    const sessionA = sessionFromDbUser(adminA, cmpA.name);
    expect(() => assertSameTenant(sessionA, userA.companyId!)).not.toThrow();
  });
});
