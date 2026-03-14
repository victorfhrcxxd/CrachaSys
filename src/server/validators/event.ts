/**
 * server/validators/event.ts
 * Schemas Zod para validação de eventos.
 */

import { z } from 'zod';

const AttendanceRuleSchema = z.object({
  ruleType: z.enum(['ALL_DAYS', 'MIN_DAYS', 'ANY_DAY']),
  minDays:  z.coerce.number().int().positive().nullish(),
});

const EventDaySchema = z.object({
  date:  z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Data do dia inválida' }),
  label: z.string().max(100).optional(),
});

export const CreateEventSchema = z.object({
  name:                  z.string().min(2, 'Nome é obrigatório').max(200),
  description:           z.string().max(2000).optional(),
  location:              z.string().max(300).optional(),
  address:               z.string().max(300).optional(),
  city:                  z.string().max(100).optional(),
  instructor:            z.string().max(200).optional(),
  workload:              z.coerce.number().int().positive().nullish(),
  capacity:              z.coerce.number().int().positive().nullish(),
  startDate:             z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Data de início inválida' }),
  endDate:               z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Data de término inválida' }),
  checkinWindowMinutes:  z.coerce.number().int().positive().optional(),
  days:                  z.array(EventDaySchema).optional(),
  attendanceRule:        AttendanceRuleSchema.optional(),
});

export const UpdateEventSchema = CreateEventSchema.partial().extend({
  status: z.enum(['UPCOMING', 'ONGOING', 'FINISHED', 'CANCELLED']).optional(),
});

const ImportParticipantRowSchema = z.object({
  name:      z.string().min(1),
  email:     z.string().email(),
  company:   z.string().optional(),
  phone:     z.string().optional(),
  document:  z.string().optional(),
  badgeRole: z.string().optional(),
});

export const ImportFullEventSchema = z.object({
  event:                  CreateEventSchema,
  participants:           z.array(ImportParticipantRowSchema).optional(),
  badgeTemplateUrl:       z.string().url().optional(),
  certificateTemplateUrl: z.string().url().optional(),
});

export type CreateEventInput        = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput        = z.infer<typeof UpdateEventSchema>;
export type ImportFullEventInput    = z.infer<typeof ImportFullEventSchema>;
export type ImportParticipantRow    = z.infer<typeof ImportParticipantRowSchema>;
