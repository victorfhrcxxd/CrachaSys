import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query as { slug: string };

  if (req.method === 'GET') {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        id: true, name: true, description: true, location: true, address: true,
        city: true, instructor: true, workload: true, capacity: true,
        startDate: true, endDate: true, status: true, isPublic: true,
        days: { orderBy: { date: 'asc' }, select: { id: true, date: true, label: true } },
        _count: { select: { participants: true } },
      },
    });
    if (!event || !event.isPublic) return res.status(404).json({ error: 'Evento não encontrado' });
    return res.json(event);
  }

  if (req.method === 'POST') {
    // Public registration
    const { name, email, company, phone } = req.body as { name: string; email: string; company?: string; phone?: string };
    if (!name || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios' });

    const event = await prisma.event.findUnique({ where: { slug }, select: { id: true, isPublic: true } });
    if (!event || !event.isPublic) return res.status(404).json({ error: 'Evento não encontrado' });

    const existing = await prisma.eventRegistration.findUnique({
      where: { email_eventId: { email, eventId: event.id } },
    });
    if (existing) return res.status(409).json({ error: 'Email já cadastrado para este evento' });

    const reg = await prisma.eventRegistration.create({
      data: { name, email, company, phone, eventId: event.id },
    });
    return res.status(201).json({ message: 'Inscrição realizada com sucesso!', id: reg.id });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
