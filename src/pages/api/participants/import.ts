import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  const isAdmin = session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN';
  if (!isAdmin) return res.status(403).json({ error: 'Apenas administradores' });

  const { rows, eventId } = req.body as { rows: Record<string, string>[]; eventId: string };
  if (!rows?.length || !eventId) return res.status(400).json({ error: 'Dados inválidos' });

  const created: string[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  for (const row of rows) {
    const name = (row['nome'] || row['name'] || '').trim();
    const email = (row['email'] || '').trim().toLowerCase();
    if (!name || !email) { errors.push(`Linha inválida: ${JSON.stringify(row)}`); continue; }

    try {
      const existing = await prisma.participant.findUnique({ where: { email_eventId: { email, eventId } } });
      if (existing) { skipped.push(email); continue; }
      await prisma.participant.create({
        data: {
          name,
          email,
          company: (row['empresa'] || row['company'] || '').trim() || null,
          document: (row['cpf'] || row['documento'] || row['document'] || '').trim() || null,
          phone: (row['telefone'] || row['phone'] || '').trim() || null,
          badgeRole: (row['funcao'] || row['role'] || 'Participante').trim(),
          eventId,
        },
      });
      created.push(email);
    } catch (e) {
      errors.push(`${email}: ${String(e)}`);
    }
  }

  return res.json({ created: created.length, skipped: skipped.length, errors });
}
