/**
 * server/response.ts
 * Helpers padronizados para respostas de API.
 * Garante formato consistente em todas as rotas.
 */

import type { NextApiResponse } from 'next';

// ── Tipos de resposta ────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

// ── Helpers de sucesso ───────────────────────────────────────────────────────

export function ok<T>(res: NextApiResponse, data: T): void {
  res.status(200).json(data);
}

export function created<T>(res: NextApiResponse, data: T): void {
  res.status(201).json(data);
}

export function noContent(res: NextApiResponse): void {
  res.status(204).end();
}

// ── Helpers de erro ──────────────────────────────────────────────────────────

export function badRequest(res: NextApiResponse, message: string, details?: unknown): void {
  const body: ApiError = { error: message, code: 'BAD_REQUEST' };
  if (details !== undefined) body.details = details;
  res.status(400).json(body);
}

export function unauthorized(res: NextApiResponse, message = 'Não autorizado'): void {
  res.status(401).json({ error: message, code: 'UNAUTHORIZED' });
}

export function forbidden(res: NextApiResponse, message = 'Acesso proibido'): void {
  res.status(403).json({ error: message, code: 'FORBIDDEN' });
}

export function notFound(res: NextApiResponse, message = 'Recurso não encontrado'): void {
  res.status(404).json({ error: message, code: 'NOT_FOUND' });
}

export function paymentRequired(res: NextApiResponse, message: string, meta?: unknown): void {
  res.status(402).json({ error: message, code: 'PLAN_LIMIT_EXCEEDED', meta });
}

export function methodNotAllowed(res: NextApiResponse): void {
  res.status(405).json({ error: 'Método não permitido', code: 'METHOD_NOT_ALLOWED' });
}

export function conflict(res: NextApiResponse, message: string): void {
  res.status(409).json({ error: message, code: 'CONFLICT' });
}

export function serverError(res: NextApiResponse, message = 'Erro interno do servidor'): void {
  res.status(500).json({ error: message, code: 'INTERNAL_SERVER_ERROR' });
}

/** Converte qualquer erro conhecido/desconhecido em resposta JSON. */
export function handleApiError(res: NextApiResponse, err: unknown): void {
  if (err instanceof Error) {
    const typed = err as Error & { statusCode?: number };
    const status = typed.statusCode ?? 500;
    res.status(status).json({ error: err.message, code: 'API_ERROR' });
    return;
  }
  serverError(res);
}
