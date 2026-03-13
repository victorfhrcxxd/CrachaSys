import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  const isAdmin = session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN';
  if (!isAdmin) return res.status(403).json({ error: 'Proibido' });

  const companyId = session.user?.companyId;

  if (req.method === 'GET') {
    const { search, role } = req.query;
    const users = await prisma.user.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(role ? { role: String(role) } : {}),
        ...(search ? {
          OR: [
            { name: { contains: String(search) } },
            { email: { contains: String(search) } },
          ],
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, photo: true, createdAt: true,
      },
    });
    return res.json(users);
  }

  if (req.method === 'POST') {
    const { name, email, password, role: userRole } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: userRole ?? 'MEMBER', companyId: companyId ?? null },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    return res.status(201).json(user);
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
