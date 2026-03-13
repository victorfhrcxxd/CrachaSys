import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  const isAdmin = session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN';
  if (!isAdmin) return res.status(403).json({ error: 'Apenas administradores' });

  const companyId = session.user?.companyId;
  const { limit = '50', page = '1' } = req.query;
  const take = Math.min(Number(limit), 100);
  const skip = (Number(page) - 1) * take;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.auditLog.count({ where: companyId ? { companyId } : {} }),
  ]);

  return res.json({ logs, total, page: Number(page), pages: Math.ceil(total / take) });
}
