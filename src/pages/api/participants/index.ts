import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth, requireAdmin } from '@/server/session';
import { ok, created, methodNotAllowed } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { CreateParticipantSchema } from '@/server/validators/participant.validator';
import { listParticipants, createParticipant } from '@/server/services/participant.service';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const user     = await requireAuth(req, res);
    const eventId  = req.query.eventId as string | undefined;
    const list     = await listParticipants(user, eventId);
    return ok(res, list);
  }

  if (req.method === 'POST') {
    const user   = await requireAdmin(req, res);
    const input  = parseBody(CreateParticipantSchema, req.body);
    const result = await createParticipant(user, input);

    return created(res, {
      ...result.participant,
      _accountCreated:    result.accountCreated,
      _generatedPassword: result.generatedPassword,
    });
  }

  return methodNotAllowed(res);
});
