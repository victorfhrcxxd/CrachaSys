import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAdmin } from '@/server/session';
import { ok, methodNotAllowed } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { ImportFullEventSchema } from '@/server/validators/event';
import { importFullEvent } from '@/server/services/event.service';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') return methodNotAllowed(res);

  const user   = await requireAdmin(req, res);
  const input  = parseBody(ImportFullEventSchema, req.body);
  const result = await importFullEvent(user, input);

  return ok(res, result);
});
