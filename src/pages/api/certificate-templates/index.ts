import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { eventId } = req.query;
    const where = eventId ? { eventId: String(eventId) } : {};
    const templates = await prisma.certificateTemplate.findMany({ where, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
    return res.json(templates);
  }

  if (req.method === 'POST') {
    const { name, eventId, fileUrl, isDefault } = req.body;
    if (!name || !eventId || !fileUrl) return res.status(400).json({ error: 'Missing fields' });
    const template = await prisma.certificateTemplate.create({
      data: { name, eventId, fileUrl, isDefault: isDefault ?? false },
    });
    return res.status(201).json(template);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end();
}
