import { prisma } from '../setup/test-db';

let seq = 0;
const uid = () => `${++seq}-${Date.now()}`;

export interface CompanyOverrides {
  name?: string;
  plan?: string;
  maxEvents?: number;
  maxParticipants?: number;
  maxCertificates?: number;
}

export async function createCompany(overrides: CompanyOverrides = {}) {
  const id = uid();
  return prisma.company.create({
    data: {
      name:            overrides.name          ?? `Company ${id}`,
      slug:            `company-${id}`,
      plan:            overrides.plan          ?? 'PRO',
      maxEvents:       overrides.maxEvents      ?? 100,
      maxParticipants: overrides.maxParticipants ?? 1000,
      maxCertificates: overrides.maxCertificates ?? 1000,
    },
  });
}

/** Company with FREE plan limits to test plan-limit enforcement. */
export async function createFreeCompany(overrides: CompanyOverrides = {}) {
  const id = uid();
  return prisma.company.create({
    data: {
      name:            overrides.name          ?? `Free Company ${id}`,
      slug:            `free-company-${id}`,
      plan:            'FREE',
      maxEvents:       overrides.maxEvents      ?? 1,
      maxParticipants: overrides.maxParticipants ?? 2,
      maxCertificates: overrides.maxCertificates ?? 2,
    },
  });
}
