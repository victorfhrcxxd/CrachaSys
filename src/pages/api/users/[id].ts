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

  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true, photo: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(user);
  }

  if (req.method === 'PUT') {
    const { name, email, role, isActive, password } = req.body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(String(password), 10);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true, photo: true, createdAt: true },
    });
    return res.json(user);
  }

  if (req.method === 'DELETE') {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (target.id === session.user?.id) return res.status(400).json({ error: 'Não é possível excluir sua própria conta' });
    await prisma.user.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
