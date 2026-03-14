import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { created, methodNotAllowed, conflict } from '@/server/response';
import { requireStaff } from '@/server/auth/session';
import { parseBody } from '@/server/validators/common';
import { ScanCheckinSchema } from '@/server/validators/checkin.validator';
import { scanCheckin, CheckinError } from '@/server/services/checkin.service';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') return methodNotAllowed(res);

  const user  = await requireStaff(req, res);
  const input = parseBody(ScanCheckinSchema, req.body);

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
