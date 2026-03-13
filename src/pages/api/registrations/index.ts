import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'ADMIN') return res.status(401).json({ error: 'Não autorizado' });

  // Registrations are now EventRegistrations — see /api/e/[slug] for public signup
  if (req.method === 'POST') {
    const { name, email, company, phone, eventId } = req.body;
    if (!name || !email || !eventId) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });

    const existing = await prisma.eventRegistration.findUnique({
      where: { email_eventId: { email, eventId } },
    });
    if (existing) return res.status(409).json({ error: 'Email já inscrito neste evento' });

    const reg = await prisma.eventRegistration.create({
      data: { name, email, company, phone, eventId },
    });
    return res.status(201).json(reg);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    await prisma.eventRegistration.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
