import { z } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { withApiHandler } from '@/server/handler';
import { requireAdmin } from '@/server/session';
import { ok, created, methodNotAllowed } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { prisma } from '@/server/prisma';

// POST é público (auto-cadastro de membro), GET requer admin
const RegisterSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(6),
});

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    // Rota pública — auto-cadastro de membro (sem auth)
    const { name, email, password } = parseBody(RegisterSchema, req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });
    const user = await prisma.user.create({
      data: { name, email, password: await bcrypt.hash(password, 12), role: 'MEMBER' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return created(res, user);
  }

  if (req.method === 'GET') {
    const admin        = await requireAdmin(req, res);
    const { search }   = req.query;
    const tenantFilter = admin.role === 'SUPER_ADMIN' ? {} : { companyId: admin.companyId };
    const members = await prisma.user.findMany({
      where: {
        role: 'MEMBER',
        ...tenantFilter,
        ...(search ? { OR: [{ name: { contains: String(search) } }, { email: { contains: String(search) } }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, photo: true, isActive: true, createdAt: true },
    });
    return ok(res, members);
  }

  return methodNotAllowed(res);
});
