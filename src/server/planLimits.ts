import { prisma } from './prisma';

export const PLAN_LIMITS: Record<string, { maxEvents: number; maxParticipants: number; maxCertificates: number; label: string }> = {
  FREE:       { maxEvents: 3,    maxParticipants: 100,  maxCertificates: 100,  label: 'Free' },
  STARTER:    { maxEvents: 10,   maxParticipants: 500,  maxCertificates: 500,  label: 'Starter' },
  PRO:        { maxEvents: 50,   maxParticipants: 5000, maxCertificates: 5000, label: 'Pro' },
  ENTERPRISE: { maxEvents: 9999, maxParticipants: 99999,maxCertificates: 99999,label: 'Enterprise' },
};

export async function checkPlanLimit(
  companyId: string,
  resource: 'events' | 'participants' | 'certificates',
): Promise<{ allowed: boolean; current: number; max: number; plan: string }> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return { allowed: false, current: 0, max: 0, plan: 'FREE' };

  const plan = company.plan ?? 'FREE';
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;

  let current = 0;
  let max = 0;

  if (resource === 'events') {
    current = await prisma.event.count({ where: { companyId } });
    max = company.maxEvents ?? limits.maxEvents;
  } else if (resource === 'participants') {
    current = await prisma.participant.count({ where: { event: { companyId } } });
    max = company.maxParticipants ?? limits.maxParticipants;
  } else {
    current = await prisma.certificate.count({ where: { event: { companyId } } });
    max = company.maxCertificates ?? limits.maxCertificates;
  }

  return { allowed: current < max, current, max, plan };
}
