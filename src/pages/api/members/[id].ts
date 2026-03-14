import { z } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { withApiHandler } from '@/server/handler';
import { requireAuth } from '@/server/session';
import { ok, noContent, notFound, methodNotAllowed, forbidden } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { prisma } from '@/server/prisma';

const memberSelect = {
  id: true, name: true, email: true, photo: true, isActive: true, role: true, createdAt: true,
} as const;

const UpdateMemberSchema = z.object({
  name:     z.string().min(2).optional(),
  email:    z.string().email().optional(),
  photo:    z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  const viewer  = await requireAuth(req, res);
  const { id }  = req.query as { id: string };
  const isAdmin = viewer.role === 'ADMIN' || viewer.role === 'SUPER_ADMIN';
  const isSelf  = viewer.id === id;

  if (!isAdmin && !isSelf) return forbidden(res, 'Acesso negado');

  // Fetch target first so every branch can check tenant scope
  const target = await prisma.user.findUnique({ where: { id }, select: { ...memberSelect, companyId: true } });
  if (!target) return notFound(res, 'Usuário não encontrado');

  // Cross-tenant guard: admins can only touch members of their own company
  if (isAdmin && !isSelf && viewer.role !== 'SUPER_ADMIN') {
    if (target.companyId !== viewer.companyId) return forbidden(res, 'Acesso negado');
  }

  if (req.method === 'GET') {
    return ok(res, target);
  }

  if (req.method === 'PUT') {
    const { name, email, photo, isActive, password } = parseBody(UpdateMemberSchema, req.body);
    const data: Record<string, unknown> = { name, email, photo };
    if (isAdmin && typeof isActive === 'boolean') data.isActive = isActive;
    if (password) data.password = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({ where: { id }, data, select: memberSelect });
    return ok(res, user);
  }

  if (req.method === 'DELETE') {
    if (!isAdmin) return forbidden(res, 'Apenas administradores podem excluir membros');
    await prisma.user.delete({ where: { id } });
    return noContent(res);
  }

  return methodNotAllowed(res);
});
