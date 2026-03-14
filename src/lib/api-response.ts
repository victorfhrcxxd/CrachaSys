/**
 * lib/api-response.ts
 * Public alias for server/response.ts — use this in new code.
 */

export {
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  paymentRequired,
  methodNotAllowed,
  conflict,
  serverError,
  handleApiError,
} from '../server/response';

export type { ApiError } from '../server/response';
