import { z } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAdmin } from '@/server/session';
import { ok, created, noContent, methodNotAllowed } from '@/server/response';
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
  await requireAdmin(req, res);

  if (req.method === 'POST') {
    const { name, email, company, phone, eventId } = parseBody(CreateRegistrationSchema, req.body);
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
    await prisma.eventRegistration.delete({ where: { id } });
    return noContent(res);
  }

  return methodNotAllowed(res);
});
