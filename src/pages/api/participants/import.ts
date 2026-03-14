import { z } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAdmin } from '@/server/session';
import { ok, methodNotAllowed } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import type { ImportParticipantRow } from '@/server/validators/participant.validator';
import { importParticipants } from '@/server/services/participant.service';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

const ImportBodySchema = z.object({
  eventId: z.string().min(1, 'eventId é obrigatório'),
  rows:    z.array(z.record(z.string())).min(1, 'Nenhuma linha enviada'),
});

/** Maps raw papaparse row (arbitrary column names) to a typed ImportParticipantRow. */
function normalizeRow(raw: Record<string, string>): ImportParticipantRow | null {
  const col = (key: string) => (raw[key] ?? '').trim();
  const name  = col('nome do aluno') || col('nome') || col('name');
  const email = (col('e-mail') || col('email')).toLowerCase();
  if (!name || !email) return null;
  return {
    name,
    email,
    company:   col('órgão público') || col('orgao publico') || col('empresa') || col('company') || undefined,
    document:  col('cpf') || col('documento') || col('document') || undefined,
    phone:     col('telefone') || col('phone') || undefined,
    badgeRole: col('funcao') || col('função') || col('role') || undefined,
  };
}

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') return methodNotAllowed(res);

  await requireAdmin(req, res);

  const { eventId, rows: rawRows } = parseBody(ImportBodySchema, req.body);

  const validRows: ImportParticipantRow[] = [];
  const parseErrors: string[] = [];

  for (const raw of rawRows) {
    const mapped = normalizeRow(raw as Record<string, string>);
    if (mapped) {
      validRows.push(mapped);
    } else {
      parseErrors.push(`Linha inválida (nome ou email ausente): ${JSON.stringify(raw)}`);
    }
  }

  const result = await importParticipants(eventId, validRows);

  return ok(res, {
    created: result.created,
    skipped: result.skipped,
    errors:  [...parseErrors, ...result.errors],
  });
});
