/**
 * server/validators/participant.ts
 * Schemas Zod para validação de participantes.
 */

import { z } from 'zod';

export const CreateParticipantSchema = z.object({
  name:      z.string().min(2, 'Nome é obrigatório').max(300),
  email:     z.string().email('E-mail inválido').max(300),
  company:   z.string().max(300).optional(),
  badgeRole: z.string().max(100).default('Participante'),
  eventId:   z.string().min(1, 'eventId é obrigatório'),
  photo:     z.string().url().optional().or(z.literal('')).transform(v => v || undefined),
});

export const UpdateParticipantSchema = CreateParticipantSchema.partial().omit({ eventId: true });

export const ImportParticipantsSchema = z.object({
  eventId:      z.string().min(1),
  participants: z.array(
    z.object({
      name:      z.string().min(1),
      email:     z.string().email(),
      company:   z.string().optional(),
      badgeRole: z.string().optional(),
    }),
  ).min(1, 'Pelo menos um participante é necessário'),
});

export type CreateParticipantInput = z.infer<typeof CreateParticipantSchema>;
export type UpdateParticipantInput = z.infer<typeof UpdateParticipantSchema>;
export type ImportParticipantsInput = z.infer<typeof ImportParticipantsSchema>;
