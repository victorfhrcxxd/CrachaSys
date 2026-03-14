/**
 * server/validators/certificate.validator.ts
 * Zod schemas for certificate domain.
 */

import { z } from 'zod';

export const IssueCertificateSchema = z.object({
  participantId: z.string().min(1, 'participantId é obrigatório'),
  eventId:       z.string().min(1, 'eventId é obrigatório'),
});

export const BulkIssueCertificateSchema = z.object({
  eventId:                z.string().min(1, 'eventId é obrigatório'),
  minAttendancePercent:   z.coerce.number().min(0).max(100).default(75),
});

export const BulkPreviewQuerySchema = z.object({
  eventId:                z.string().min(1),
  minAttendancePercent:   z.coerce.number().min(0).max(100).default(75),
});

export type IssueCertificateInput      = z.infer<typeof IssueCertificateSchema>;
export type BulkIssueCertificateInput  = z.infer<typeof BulkIssueCertificateSchema>;
