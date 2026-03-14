import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth, requireAdmin } from '@/server/session';
import { ok, created, methodNotAllowed } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { CreateParticipantSchema } from '@/server/validators/participant';
import { listParticipants, createParticipant } from '@/server/services/participant.service';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await requireAuth(req, res);
    const { eventId } = req.query as { eventId?: string };
    const list = await listParticipants(eventId);
    return ok(res, list);
  }

  if (req.method === 'POST') {
    const user   = await requireAdmin(req, res);
    const raw    = parseBody(CreateParticipantSchema, req.body);
    const input  = { ...raw, badgeRole: raw.badgeRole ?? 'Participante' };
    const result = await createParticipant(user, input);

    return created(res, {
      ...result.participant,
      _accountCreated:   result.accountCreated,
      _generatedPassword: result.generatedPassword,
    });
  }

  return methodNotAllowed(res);
});
