import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  const { id } = req.query as { id: string };
  const isAdmin = session.user?.role === 'ADMIN';
  const isSelf = session.user?.id === id;

  if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Proibido' });

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, photo: true, isActive: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(user);
  }

  if (req.method === 'PUT') {
    const { name, email, photo, isActive, password } = req.body;
    const updateData: Record<string, unknown> = { name, email, photo };
    if (isAdmin && typeof isActive === 'boolean') updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, photo: true, isActive: true },
    });
    return res.json(user);
  }

  if (req.method === 'DELETE') {
    if (!isAdmin) return res.status(403).json({ error: 'Proibido' });
    await prisma.user.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
