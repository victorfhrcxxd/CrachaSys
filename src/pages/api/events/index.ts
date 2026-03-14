import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth, requireAdmin } from '@/server/session';
import { ok, created, methodNotAllowed, paymentRequired } from '@/server/response';
import { assertAdmin } from '@/server/policies/access';
import { parseBody } from '@/server/validators/common';
import { CreateEventSchema } from '@/server/validators/event';
import { listEvents, createEvent } from '@/server/services/event.service';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const user   = await requireAuth(req, res);
    const events = await listEvents(user);
    return ok(res, events);
  }

  if (req.method === 'POST') {
    const user  = await requireAdmin(req, res);
    assertAdmin(user);                              // redundante mas explícito

    const input  = parseBody(CreateEventSchema, req.body);
    const result = await createEvent(user, input);

    if (result.planError) {
      return paymentRequired(res, result.planError.message, result.planError.meta);
    }

    return created(res, result.event);
  }

  return methodNotAllowed(res);
});
