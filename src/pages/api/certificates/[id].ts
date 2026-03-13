import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    const cert = await prisma.certificate.findUnique({
      where: { id },
      include: {
        participant: { select: { id: true, name: true, email: true, company: true } },
        event: { select: { id: true, name: true, workload: true, startDate: true, endDate: true, instructor: true } },
      },
    });
    if (!cert) return res.status(404).json({ error: 'Certificado não encontrado' });
    return res.json(cert);
  }

  if (req.method === 'DELETE') {
    if (session.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Proibido' });
    await prisma.certificate.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
