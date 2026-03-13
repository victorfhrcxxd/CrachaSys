import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const { code } = req.query as { code: string };

  const cert = await prisma.certificate.findUnique({
    where: { verificationCode: code },
    include: {
      participant: { select: { name: true, email: true, company: true, badgeRole: true } },
      event: { select: { name: true, startDate: true, endDate: true, location: true, city: true, instructor: true, workload: true } },
    },
  });

  if (!cert) return res.status(404).json({ error: 'Certificado não encontrado' });

  return res.json(cert);
}
