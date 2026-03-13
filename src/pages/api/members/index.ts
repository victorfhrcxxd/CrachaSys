import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: 'MEMBER' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return res.status(201).json(user);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'ADMIN') return res.status(401).json({ error: 'Não autorizado' });

  if (req.method === 'GET') {
    const { search } = req.query;
    const members = await prisma.user.findMany({
      where: {
        role: 'MEMBER',
        ...(search ? { OR: [{ name: { contains: String(search) } }, { email: { contains: String(search) } }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, photo: true, isActive: true, createdAt: true },
    });
    return res.json(members);
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
