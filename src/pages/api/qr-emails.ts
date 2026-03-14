import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAdmin } from '@/server/session';
import { ok, methodNotAllowed } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { SendQrEmailsSchema } from '@/server/validators/qr-email.validator';
import { sendQrCodes } from '@/server/services/qr-email.service';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') return methodNotAllowed(res);

  const admin = await requireAdmin(req, res);
  const input = parseBody(SendQrEmailsSchema, req.body);
  const result = await sendQrCodes(admin, input);

  return ok(res, result);
});
