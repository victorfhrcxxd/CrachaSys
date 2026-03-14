import { useState, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter }          from 'next/router';
import { generateEventDays }  from '../utils/generateEventDays';
import type { EventDay }      from '../utils/generateEventDays';
import { parseParticipantRows } from '../utils/parseParticipants';
import type { ParseResult }   from '../utils/parseParticipants';

export type { EventDay };

// ── Shared types ──────────────────────────────────────────────────────────────

export interface WizardForm {
  name:                 string;
  eventType:            string;
  startDate:            string;
  endDate:              string;
  city:                 string;
  location:             string;
  description:          string;
  address:              string;
  workload:             string;
  checkinWindowMinutes: string;
}

export interface Speaker {
  id:            string;
  name:          string;
  title:         string;
  org:           string;
  email:         string;
  generateBadge: boolean;
}

export interface StaffMember {
  id:   string;
  name: string;
  role: string;
}

export type PeopleTab      = 'participants' | 'speakers' | 'staff';
export type TemplateOption = 'default' | 'custom';

export interface ImportResult {
  eventId:   string;
  eventName: string;
  created:   number;
  skipped:   number;
  errors:    string[];
}

export type { ParseResult };

// ── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_FORM: WizardForm = {
  name:                 '',
  eventType:            '',
  startDate:            '',
  endDate:              '',
  city:                 '',
  location:             '',
  description:          '',
  address:              '',
  workload:             '',
  checkinWindowMinutes: '60',
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useEventWizard() {
  const router = useRouter();

  // Navigation
  const [step, setStep] = useState(0);

  // Step 1
  const [form,         setFormState]    = useState<WizardForm>(DEFAULT_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [days,         setDays]         = useState<EventDay[]>([]);

  // Step 2
  const [peopleTab,    setPeopleTab]    = useState<PeopleTab>('participants');
  const [parseResult,  setParseResult]  = useState<ParseResult>({ rows: [], duplicates: 0, invalid: 0 });
  const [csvFileName,  setCsvFileName]  = useState('');
  const [speakers,     setSpeakers]     = useState<Speaker[]>([]);
  const [newSpeaker,   setNewSpeaker]   = useState({ name: '', title: '', org: '', email: '', generateBadge: true });
  const [staff,        setStaff]        = useState<StaffMember[]>([]);
  const [newStaff,     setNewStaff]     = useState({ name: '', role: '' });

  // Step 3
  const [badgeOption,    setBadgeOption]    = useState<TemplateOption>('default');
  const [certOption,     setCertOption]     = useState<TemplateOption>('default');
  const [badgeUrl,       setBadgeUrl]       = useState('');
  const [badgeName,      setBadgeName]      = useState('');
  const [certUrl,        setCertUrl]        = useState('');
  const [certName,       setCertName]       = useState('');
  const [uploadingBadge, setUploadingBadge] = useState(false);
  const [uploadingCert,  setUploadingCert]  = useState(false);
  const [uploadError,    setUploadError]    = useState('');

  // Step 4
  const [importing,   setImporting]   = useState(false);
  const [importError, setImportError] = useState('');
  const [result,      setResult]      = useState<ImportResult | null>(null);

  // ── Step 1 handlers ──────────────────────────────────────────────────────────

  const setField = useCallback((field: keyof WizardForm, value: string) => {
    setFormState((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'startDate' || field === 'endDate') {
        const s = field === 'startDate' ? value : prev.startDate;
        const e = field === 'endDate'   ? value : prev.endDate;
        setDays(generateEventDays(s, e));
      }
      return next;
    });
  }, []);

  const updateDayLabel = (idx: number, label: string) =>
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, label } : d)));

  // ── Step 2 handlers ──────────────────────────────────────────────────────────

  const handleCSVFile = async (file: File) => {
    setCsvFileName(file.name);
    const Papa = (await import('papaparse')).default;
    Papa.parse(file, {
      header:         true,
      skipEmptyLines: true,
      complete: (r) => setParseResult(parseParticipantRows(r.data as Record<string, string>[])),
    });
  };

  const handleCSV = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCSVFile(file);
  };

  const addSpeaker = () => {
    if (!newSpeaker.name) return;
    const email = newSpeaker.email.trim() ||
      `${newSpeaker.name.toLowerCase().replace(/\s+/g, '.')}.palestrante@local`;
    setSpeakers((s) => [...s, { id: uid(), ...newSpeaker, email }]);
    setNewSpeaker({ name: '', title: '', org: '', email: '', generateBadge: true });
  };

  const removeSpeaker = (id: string) =>
    setSpeakers((prev) => prev.filter((s) => s.id !== id));

  const addStaff = () => {
    if (!newStaff.name) return;
    setStaff((s) => [...s, { id: uid(), ...newStaff }]);
    setNewStaff({ name: '', role: '' });
  };

  const removeStaff = (id: string) =>
    setStaff((prev) => prev.filter((s) => s.id !== id));

  // ── Step 3 handlers ──────────────────────────────────────────────────────────

  const uploadImage = async (
    file:       File,
    setUrl:     (u: string) => void,
    setName:    (n: string) => void,
    setLoading: (v: boolean) => void,
  ) => {
    setLoading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? 'Erro no upload. Tente novamente.'); return; }
      setUrl(data.url  ?? '');
      setName(file.name);
    } catch {
      setUploadError('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBadgeFile = (f: File) => uploadImage(f, setBadgeUrl, setBadgeName, setUploadingBadge);
  const handleCertFile  = (f: File) => uploadImage(f, setCertUrl,  setCertName,  setUploadingCert);

  // ── Step 4 handler ───────────────────────────────────────────────────────────

  const handleImport = async () => {
    setImporting(true);
    setImportError('');
    try {
      const speakerRows = speakers
        .filter((s) => s.generateBadge)
        .map((s) => ({
          name:      s.name,
          email:     s.email,
          company:   s.org   || undefined,
          badgeRole: s.title || 'Palestrante',
        }));

      const body = {
        event: {
          name:                 form.name,
          description:          form.description || undefined,
          location:             form.location    || undefined,
          address:              form.address     || undefined,
          city:                 form.city        || undefined,
          instructor:           speakers[0]?.name || undefined,
          workload:             form.workload ? Number(form.workload) : undefined,
          startDate:            form.startDate,
          endDate:              form.endDate,
          checkinWindowMinutes: Number(form.checkinWindowMinutes) || 60,
          days:                 days.length > 0 ? days : undefined,
        },
        participants:           [...parseResult.rows, ...speakerRows],
        badgeTemplateUrl:       badgeOption === 'custom' && badgeUrl ? badgeUrl : undefined,
        certificateTemplateUrl: certOption  === 'custom' && certUrl  ? certUrl  : undefined,
      };

      const res  = await fetch('/api/events/import-full', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setImportError(data.error ?? 'Erro desconhecido.');
      else          setResult(data);
    } catch (e) {
      setImportError(String(e));
    } finally {
      setImporting(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const canProceedStep1 = Boolean(
    form.name && form.eventType && form.startDate && form.endDate && form.city && form.location,
  );

  const totalPeople = parseResult.rows.length + speakers.length + staff.length;

  return {
    router,
    step, setStep,
    // step 1
    form, setField, days, updateDayLabel, showAdvanced, setShowAdvanced, canProceedStep1,
    // step 2
    peopleTab, setPeopleTab,
    parseResult, csvFileName, handleCSV,
    speakers, newSpeaker, setNewSpeaker, addSpeaker, removeSpeaker,
    staff, newStaff, setNewStaff, addStaff, removeStaff,
    // step 3
    badgeOption, setBadgeOption, certOption, setCertOption,
    badgeUrl, badgeName, certUrl, certName,
    uploadingBadge, uploadingCert, uploadError,
    handleBadgeFile, handleCertFile,
    // step 4
    importing, importError, result, handleImport,
    // shared
    totalPeople,
  };
}

export type WizardState = ReturnType<typeof useEventWizard>;
