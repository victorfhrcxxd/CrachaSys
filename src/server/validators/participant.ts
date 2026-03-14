/**
 * server/validators/participant.ts
 * Backward-compat re-export. New code should import from participant.validator.ts
 */

export {
  CreateParticipantSchema,
  UpdateParticipantSchema,
  ImportParticipantsSchema,
  ImportParticipantRowSchema,
} from './participant.validator';

export type {
  CreateParticipantInput,
  UpdateParticipantInput,
  ImportParticipantsInput,
  ImportParticipantRow,
} from './participant.validator';
