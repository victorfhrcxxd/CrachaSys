import { z } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth, requireAdmin } from '@/server/session';
import { ok, noContent, notFound, methodNotAllowed } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { prisma } from '@/server/prisma';

const UpdateTemplateSchema = z.object({
  name:      z.string().min(1).optional(),
  fileUrl:   z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
});

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    await requireAuth(req, res);
    const template = await prisma.badgeTemplate.findUnique({ where: { id } });
    if (!template) return notFound(res, 'Template não encontrado');
    return ok(res, template);
  }

  if (req.method === 'PUT') {
    await requireAdmin(req, res);
    const data = parseBody(UpdateTemplateSchema, req.body);
    const template = await prisma.badgeTemplate.update({ where: { id }, data });
    return ok(res, template);
  }

  if (req.method === 'DELETE') {
    await requireAdmin(req, res);
    await prisma.badgeTemplate.delete({ where: { id } });
    return noContent(res);
  }

  return methodNotAllowed(res);
});
