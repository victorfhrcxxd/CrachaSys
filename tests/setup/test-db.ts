/**
 * tests/setup/test-db.ts
 * Shared Prisma instance for tests (re-uses the app singleton so both
 * factories and services touch the same connection / same DB).
 *
 * Also exports cleanDb() which deletes all rows in dependency order.
 */

export { prisma } from '@/server/prisma';
import { prisma } from '@/server/prisma';

/** Truncates all tables in FK-safe order. Call in beforeEach per test file. */
export async function cleanDb(): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.attendanceRule.deleteMany();
  await prisma.badgeTemplate.deleteMany();
  await prisma.certificateTemplate.deleteMany();
  await prisma.eventDay.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
}
