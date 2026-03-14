/**
 * server/validators/common.ts
 * Schemas Zod compartilhados entre módulos.
 */

import { z } from 'zod';

export const PaginationSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const IdParamSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
});

export const DateSchema = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), { message: 'Data inválida' })
  .transform((v) => new Date(v));

export const OptionalDateSchema = DateSchema.optional();

/** Utilitário: parse e lança ZodError (capturado pelo withApiHandler) */
export function parseBody<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export function parseQuery<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}
