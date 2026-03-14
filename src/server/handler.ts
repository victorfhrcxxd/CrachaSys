/**
 * server/handler.ts
 * Wrapper withApiHandler() — envolve toda route handler com:
 *  - try/catch global → never leak stack traces para o cliente
 *  - ZodError → 400 com detalhes de validação legíveis
 *  - UnauthorizedError / ForbiddenError → status correto
 *  - qualquer outro Error → 500
 *
 * Uso:
 *   export default withApiHandler(async (req, res) => { ... });
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ZodError } from 'zod';
import { UnauthorizedError, ForbiddenError } from './session';
import { handleApiError, badRequest } from './response';

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

export function withApiHandler(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        badRequest(res, 'Dados de entrada inválidos', details);
        return;
      }

      if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
        handleApiError(res, err);
        return;
      }

      // Log de erro real no servidor, resposta genérica para o cliente
      console.error('[API Error]', err);
      handleApiError(res, err);
    }
  };
}
