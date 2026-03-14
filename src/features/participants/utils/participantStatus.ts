import type { Event } from '@/hooks/useEvents';

// ── Rich participant types (matches the actual API response) ──────────────────

export interface CheckInRecord {
  id:           string;
  checkedInAt:  string;
  eventDay:     { id: string; date: string; label?: string | null };
}

export interface CertificateRecord {
  id:               string;
  verificationCode: string;
  issuedAt:         string;
  fileUrl?:         string | null;
}

export interface RichParticipant {
  id:         string;
  name:       string;
  email:      string;
  company?:   string | null;
  document?:  string | null;
  phone?:     string | null;
  badgeRole:  string;
  qrToken:    string;
  createdAt:  string;
  checkins:   CheckInRecord[];
  certificate: CertificateRecord | null;
}

// ── Status types ──────────────────────────────────────────────────────────────

export type CheckinStatus = 'present' | 'absent';
export type CertStatus    = 'issued'  | 'eligible' | 'not_eligible';

// ── Status resolvers ──────────────────────────────────────────────────────────

export function getCheckinStatus(p: RichParticipant): CheckinStatus {
  return p.checkins.length > 0 ? 'present' : 'absent';
}

export function getCertStatus(
  p:     RichParticipant,
  event: Event | null | undefined,
): CertStatus {
  if (p.certificate) return 'issued';

  const checkinCount = p.checkins.length;
  if (checkinCount === 0) return 'not_eligible';

  const totalDays = event?.days?.length ?? 0;
  const rule      = event?.attendanceRule;

  if (rule?.ruleType === 'MIN_DAYS') {
    const required = rule.minDays ?? 1;
    return checkinCount >= required ? 'eligible' : 'not_eligible';
  }

  // Default: PERCENTAGE threshold of 75 %
  if (totalDays === 0) return 'eligible';
  return checkinCount / totalDays >= 0.75 ? 'eligible' : 'not_eligible';
}

// ── Filter state ──────────────────────────────────────────────────────────────

export interface ParticipantFilters {
  search:        string;
  role:          string;
  checkinStatus: '' | 'present' | 'absent';
  certStatus:    '' | 'issued' | 'eligible' | 'not_eligible';
}

export const EMPTY_FILTERS: ParticipantFilters = {
  search: '', role: '', checkinStatus: '', certStatus: '',
};

export function hasActiveFilters(f: ParticipantFilters): boolean {
  return f.role !== '' || f.checkinStatus !== '' || f.certStatus !== '' || f.search !== '';
}

// ── Filter function ───────────────────────────────────────────────────────────

export function filterParticipants(
  participants: RichParticipant[],
  filters:      ParticipantFilters,
  event:        Event | null | undefined,
): RichParticipant[] {
  const q = filters.search.trim().toLowerCase();

  return participants.filter(p => {
    if (q && !(
      p.name.toLowerCase().includes(q)    ||
      p.email.toLowerCase().includes(q)   ||
      (p.phone   ?? '').toLowerCase().includes(q) ||
      (p.company ?? '').toLowerCase().includes(q)
    )) return false;

    if (filters.role && p.badgeRole !== filters.role) return false;

    if (filters.checkinStatus && getCheckinStatus(p) !== filters.checkinStatus) return false;

    if (filters.certStatus && getCertStatus(p, event) !== filters.certStatus) return false;

    return true;
  });
}

// ── Display metadata ──────────────────────────────────────────────────────────

export const CHECKIN_BADGE: Record<CheckinStatus, { label: string; className: string }> = {
  present: { label: 'Presente',         className: 'bg-success-subtle text-success' },
  absent:  { label: 'Não fez check-in', className: 'bg-muted text-muted-foreground' },
};

export const CERT_BADGE: Record<CertStatus, { label: string; className: string }> = {
  issued:       { label: 'Emitido',      className: 'bg-primary/10 text-primary' },
  eligible:     { label: 'Elegível',     className: 'bg-warning-subtle text-warning' },
  not_eligible: { label: 'Não elegível', className: 'bg-muted text-muted-foreground' },
};

export const ROLE_OPTIONS = ['Participante', 'Palestrante', 'Instrutor', 'Organizador', 'Staff'];

export const ROLE_COLORS: Record<string, string> = {
  Participante: 'bg-blue-50 text-blue-700',
  Palestrante:  'bg-purple-50 text-purple-700',
  Instrutor:    'bg-teal-50 text-teal-700',
  Organizador:  'bg-orange-50 text-orange-700',
  Staff:        'bg-slate-100 text-slate-600',
};
