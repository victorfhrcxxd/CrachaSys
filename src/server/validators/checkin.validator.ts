/**
 * server/validators/checkin.validator.ts
 * Zod schemas for check-in domain.
 */

import { z } from 'zod';

export const ScanCheckinSchema = z.object({
  qrToken:    z.string().min(1, 'qrToken é obrigatório'),
  eventDayId: z.string().min(1, 'eventDayId é obrigatório'),
});

export type ScanCheckinInput = z.infer<typeof ScanCheckinSchema>;
