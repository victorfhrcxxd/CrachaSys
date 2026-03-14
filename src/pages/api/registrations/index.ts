import { z } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAdmin } from '@/server/session';
import { ok, created, noContent, notFound, forbidden, methodNotAllowed } from '@/server/response';
import { prisma } from '@/server/prisma';
import { parseBody } from '@/server/validators/common';

const CreateRegistrationSchema = z.object({
  name:    z.string().min(2),
  email:   z.string().email(),
  company: z.string().optional(),
  phone:   z.string().optional(),
  eventId: z.string().min(1),
});

const DeleteRegistrationSchema = z.object({
  id: z.string().min(1),
});

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  const admin = await requireAdmin(req, res);

  if (req.method === 'GET') {
    const { eventId } = req.query;
    const tenantFilter = admin.role === 'SUPER_ADMIN' ? {} : { event: { companyId: admin.companyId } };
    const regs = await prisma.eventRegistration.findMany({
      where: { ...(eventId ? { eventId: String(eventId) } : {}), ...tenantFilter },
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, regs);
  }

  if (req.method === 'POST') {
    const { name, email, company, phone, eventId } = parseBody(CreateRegistrationSchema, req.body);

    // Tenant scope: event must belong to admin's company
    if (admin.role !== 'SUPER_ADMIN') {
      const event = await prisma.event.findUnique({ where: { id: eventId }, select: { companyId: true } });
      if (!event) return notFound(res, 'Evento não encontrado');
      if (event.companyId !== admin.companyId) return forbidden(res, 'Acesso negado');
    }

    const existing = await prisma.eventRegistration.findUnique({
      where: { email_eventId: { email, eventId } },
    });
    if (existing) return res.status(409).json({ error: 'Email já inscrito neste evento' });

    const reg = await prisma.eventRegistration.create({
      data: { name, email, company, phone, eventId },
    });
    return created(res, reg);
  }

  if (req.method === 'DELETE') {
    const { id } = parseBody(DeleteRegistrationSchema, req.body);

    // Tenant scope: resolve event via registration
    if (admin.role !== 'SUPER_ADMIN') {
      const reg = await prisma.eventRegistration.findUnique({
        where: { id },
        select: { event: { select: { companyId: true } } },
      });
      if (!reg) return notFound(res, 'Inscrição não encontrada');
      if (reg.event.companyId !== admin.companyId) return forbidden(res, 'Acesso negado');
    }

    await prisma.eventRegistration.delete({ where: { id } });
    return noContent(res);
  }

  return methodNotAllowed(res);
});
