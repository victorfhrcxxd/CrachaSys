import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth, requireAdmin } from '@/server/session';
import { assertAdmin, assertCompanyAccess } from '@/server/policies/access';
import { ok, noContent, notFound, methodNotAllowed } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { UpdateEventSchema } from '@/server/validators/event';
import { getEvent, updateEvent, deleteEvent } from '@/server/services/event.service';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    const user  = await requireAuth(req, res);
    const event = await getEvent(id);
    if (!event) return notFound(res, 'Evento não encontrado');
    assertCompanyAccess(user, event.companyId);
    return ok(res, event);
  }

  if (req.method === 'PUT') {
    const user  = await requireAdmin(req, res);
    const event = await getEvent(id);
    if (!event) return notFound(res, 'Evento não encontrado');
    assertCompanyAccess(user, event.companyId);
    const input   = parseBody(UpdateEventSchema, req.body);
    const updated = await updateEvent(user, id, input);
    return ok(res, updated);
  }

  if (req.method === 'DELETE') {
    const user  = await requireAdmin(req, res);
    const event = await getEvent(id);
    if (!event) return notFound(res, 'Evento não encontrado');
    assertCompanyAccess(user, event.companyId);
    await deleteEvent(user, id);
    return noContent(res);
  }

  return methodNotAllowed(res);
});
