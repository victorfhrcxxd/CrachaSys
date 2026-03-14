import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

// Helper to normalize column names: remove leading numbers/dots and convert to lowercase
function normalizeColumnName(key: string): string {
  return key.replace(/^\d+\.\s*/, '').trim().toLowerCase();
}

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
  const processedEmailsInBatch = new Set<string>(); // To deduplicate within the current CSV batch

  for (const originalRow of rows) {
    // Normalize row keys for easier access
    const row: Record<string, string> = {};
    for (const key in originalRow) {
      if (Object.prototype.hasOwnProperty.call(originalRow, key)) {
        row[normalizeColumnName(key)] = originalRow[key];
      }
    }

    // Suporta: "Nome do Aluno", "nome", "name"
    const name = (row['nome do aluno'] || row['nome'] || row['name'] || '').trim();
    // Suporta: "E-mail", "email"
    const email = (row['e-mail'] || row['email'] || '').trim().toLowerCase();

    if (!name || !email) {
      errors.push(`Linha inválida (nome ou email ausente): ${JSON.stringify(originalRow)}`);
      continue;
    }

    // Deduplicate within the current batch
    if (processedEmailsInBatch.has(email)) {
      skipped.push(`${email} (duplicado no arquivo)`);
      continue;
    }
    processedEmailsInBatch.add(email);

    try {
      const existing = await prisma.participant.findUnique({ where: { email_eventId: { email, eventId } } });
      if (existing) {
        skipped.push(`${email} (já cadastrado)`);
        continue;
      }

      await prisma.participant.create({
        data: {
          name,
          email,
          company: (row['órgão público'] || row['orgao publico'] || row['empresa'] || row['company'] || '').trim() || null,
          document: (row['cpf'] || row['documento'] || row['document'] || '').trim() || null,
          phone: (row['telefone'] || row['phone'] || '').trim() || null,
          badgeRole: (row['funcao'] || row['função'] || row['role'] || 'Participante').trim(),
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
