/**
 * api/courses/index.ts
 * Alias legado de /api/events — mantido para compatibilidade de clientes antigos.
 * Redireciona tráfego interno para o mesmo service de eventos.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth, requireAdmin } from '@/server/session';
import { ok, created, methodNotAllowed } from '@/server/response';
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
    const user   = await requireAdmin(req, res);
    const input  = parseBody(CreateEventSchema, req.body);
    const result = await createEvent(user, input);
    if (result.planError) return res.status(402).json({ error: result.planError.message });
    return created(res, result.event);
  }

  return methodNotAllowed(res);
});
