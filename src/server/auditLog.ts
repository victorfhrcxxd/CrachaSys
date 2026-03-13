import { prisma } from './prisma';

export async function createAuditLog(opts: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  companyId?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId ?? null,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId ?? null,
        meta: opts.meta ? JSON.stringify(opts.meta) : null,
        companyId: opts.companyId ?? null,
      },
    });
  } catch {
    // Audit log failure must never break main flow
  }
}
