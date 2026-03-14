import { z } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { withApiHandler } from '@/server/handler';
import { requireAdmin } from '@/server/session';
import { ok, noContent, notFound, methodNotAllowed, forbidden } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { prisma } from '@/server/prisma';

const userSelect = {
  id: true, name: true, email: true, role: true,
  isActive: true, photo: true, createdAt: true,
} as const;

const UpdateUserSchema = z.object({
  name:     z.string().min(2).optional(),
  email:    z.string().email().optional(),
  role:     z.enum(['MEMBER', 'ADMIN', 'SUPER_ADMIN', 'CREDENTIAL_STAFF']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  const admin = await requireAdmin(req, res);
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) return notFound(res, 'Usuário não encontrado');
    return ok(res, user);
  }

  if (req.method === 'PUT') {
    const { name, email, role, isActive, password } = parseBody(UpdateUserSchema, req.body);
    const updateData: Record<string, unknown> = {};
    if (name     !== undefined) updateData.name     = name;
    if (email    !== undefined) updateData.email    = email;
    if (role     !== undefined) updateData.role     = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password)               updateData.password = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({ where: { id }, data: updateData, select: userSelect });
    return ok(res, user);
  }

  if (req.method === 'DELETE') {
    if (id === admin.id) return forbidden(res, 'Não é possível excluir sua própria conta');
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return notFound(res, 'Usuário não encontrado');
    await prisma.user.delete({ where: { id } });
    return noContent(res);
  }

  return methodNotAllowed(res);
});
