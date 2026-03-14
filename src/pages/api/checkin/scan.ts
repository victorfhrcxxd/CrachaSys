import { z } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth } from '@/server/session';
import { ok, created, methodNotAllowed, conflict } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { scanCheckin, CheckinError } from '@/server/services/checkin.service';

const ScanSchema = z.object({
  qrToken:    z.string().min(1, 'qrToken é obrigatório'),
  eventDayId: z.string().min(1, 'eventDayId é obrigatório'),
});

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CREDENTIAL_STAFF'] as const;

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') return methodNotAllowed(res);

  const user = await requireAuth(req, res);
  if (!ALLOWED_ROLES.includes(user.role as typeof ALLOWED_ROLES[number])) {
    return res.status(403).json({ error: 'Sem permissão para realizar check-in' });
  }

  const input = parseBody(ScanSchema, req.body);

  try {
    const result = await scanCheckin(user, input);
    if (result.duplicate) {
      return conflict(res, result.message!);
    }
    return created(res, result);
  } catch (err) {
    if (err instanceof CheckinError) {
      return res.status(err.statusCode).json({ error: err.message, ...err.extra });
    }
    throw err; // re-lança para o withApiHandler lidar
  }
});
