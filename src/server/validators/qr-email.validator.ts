import { z } from 'zod';

export const SendQrEmailsSchema = z.object({
  eventId: z.string().min(1, 'eventId é obrigatório'),
  onlyNew: z.boolean().optional(),
});

export type SendQrEmailsInput = z.infer<typeof SendQrEmailsSchema>;
