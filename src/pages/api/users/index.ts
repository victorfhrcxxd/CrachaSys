import { z } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { withApiHandler } from '@/server/handler';
import { requireAdmin } from '@/server/session';
import { ok, created, methodNotAllowed } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { prisma } from '@/server/prisma';

const userSelect = {
  id: true, name: true, email: true, role: true,
  isActive: true, photo: true, createdAt: true,
} as const;

const CreateUserSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(6),
  role:     z.enum(['MEMBER', 'ADMIN', 'SUPER_ADMIN', 'CREDENTIAL_STAFF']).optional(),
});

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  const admin = await requireAdmin(req, res);

  if (req.method === 'GET') {
    const { search, role } = req.query;
    const users = await prisma.user.findMany({
      where: {
        companyId: admin.companyId,
        ...(role   ? { role: String(role) }  : {}),
        ...(search ? { OR: [
          { name:  { contains: String(search) } },
          { email: { contains: String(search) } },
        ] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: userSelect,
    });
    return ok(res, users);
  }

  if (req.method === 'POST') {
    const { name, email, password, role } = parseBody(CreateUserSchema, req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });
    const user = await prisma.user.create({
      data: { name, email, password: await bcrypt.hash(password, 10), role: role ?? 'MEMBER', companyId: admin.companyId },
      select: userSelect,
    });
    return created(res, user);
  }

  return methodNotAllowed(res);
});
