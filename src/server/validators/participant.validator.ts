/**
 * server/validators/participant.validator.ts
 * Canonical Zod schemas for the participant domain.
 * The old participant.ts re-exports from here for backward compat.
 */

import { z } from 'zod';

export const CreateParticipantSchema = z.object({
  name:      z.string().min(2, 'Nome é obrigatório').max(300),
  email:     z.string().email('E-mail inválido').max(300),
  company:   z.string().max(300).optional(),
  document:  z.string().max(100).optional(),
  phone:     z.string().max(50).optional(),
  badgeRole: z.string().max(100).optional(),
  eventId:   z.string().min(1, 'eventId é obrigatório'),
  photo:     z.string().url().optional().or(z.literal('')),
});

export const UpdateParticipantSchema = CreateParticipantSchema.partial().omit({ eventId: true });

// Each row coming from a CSV/import payload
export const ImportParticipantRowSchema = z.object({
  name:      z.string().min(1),
  email:     z.string().email(),
  company:   z.string().optional(),
  document:  z.string().optional(),
  phone:     z.string().optional(),
  badgeRole: z.string().optional(),
});

export const ImportParticipantsSchema = z.object({
  eventId: z.string().min(1, 'eventId é obrigatório'),
  rows:    z.array(ImportParticipantRowSchema).min(1, 'Pelo menos um participante é necessário'),
});

export type CreateParticipantInput     = z.infer<typeof CreateParticipantSchema>;
export type UpdateParticipantInput     = z.infer<typeof UpdateParticipantSchema>;
export type ImportParticipantRow       = z.infer<typeof ImportParticipantRowSchema>;
export type ImportParticipantsInput    = z.infer<typeof ImportParticipantsSchema>;
