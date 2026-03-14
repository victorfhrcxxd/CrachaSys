import { z } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth, requireAdmin } from '@/server/session';
import { ok, created, methodNotAllowed } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { prisma } from '@/server/prisma';

const CreateTemplateSchema = z.object({
  name:      z.string().min(1),
  eventId:   z.string().min(1),
  fileUrl:   z.string().min(1),
  isDefault: z.boolean().default(false),
});

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await requireAuth(req, res);
    const { eventId } = req.query;
    const templates = await prisma.badgeTemplate.findMany({
      where: eventId ? { eventId: String(eventId) } : {},
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return ok(res, templates);
  }

  if (req.method === 'POST') {
    await requireAdmin(req, res);
    const { name, eventId, fileUrl, isDefault } = parseBody(CreateTemplateSchema, req.body);
    const template = await prisma.badgeTemplate.create({
      data: { name, eventId, fileUrl, isDefault },
    });
    return created(res, template);
  }

  return methodNotAllowed(res);
});
