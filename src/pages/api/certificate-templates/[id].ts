import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;

  if (req.method === 'GET') {
    const template = await prisma.certificateTemplate.findUnique({ where: { id: String(id) } });
    if (!template) return res.status(404).json({ error: 'Not found' });
    return res.json(template);
  }

  if (req.method === 'PUT') {
    const { name, fileUrl, isDefault } = req.body;
    const template = await prisma.certificateTemplate.update({
      where: { id: String(id) },
      data: { ...(name && { name }), ...(fileUrl && { fileUrl }), ...(isDefault !== undefined && { isDefault }) },
    });
    return res.json(template);
  }

  if (req.method === 'DELETE') {
    await prisma.certificateTemplate.delete({ where: { id: String(id) } });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end();
}
