export interface ParticipantRow {
  name:      string;
  email:     string;
  company?:  string;
  phone?:    string;
  document?: string;
  badgeRole?: string;
}

export interface ParseResult {
  rows:       ParticipantRow[];
  duplicates: number;
  invalid:    number;
}

function normKey(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function pickField(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    for (const rowKey of Object.keys(row)) {
      if (normKey(rowKey) === normKey(k)) return (row[rowKey] ?? '').trim();
    }
  }
  return '';
}

export function parseParticipantRows(rawRows: Record<string, string>[]): ParseResult {
  const seen  = new Set<string>();
  const rows: ParticipantRow[] = [];
  let duplicates = 0;
  let invalid    = 0;

  for (const raw of rawRows) {
    const name  = pickField(raw, 'Nome do Aluno', 'nome', 'name', 'Nome')
      .replace(/^\d+\.\s*/, '')
      .trim();
    const email = pickField(raw, 'E-mail', 'email', 'Email', 'e-mail').toLowerCase().trim();

    if (!name || !email) { invalid++;    continue; }
    if (seen.has(email))  { duplicates++; continue; }

    seen.add(email);
    rows.push({
      name,
      email,
      company:  pickField(raw, 'Órgão Público', 'orgao publico', 'empresa', 'company') || undefined,
      phone:    pickField(raw, 'Telefone', 'telefone', 'phone')                         || undefined,
      document: pickField(raw, 'CPF', 'cpf', 'documento', 'document')                  || undefined,
      badgeRole: pickField(raw, 'funcao', 'role', 'Função')                             || 'Participante',
    });
  }

  return { rows, duplicates, invalid };
}

export function downloadCSVTemplate(): void {
  const blob = new Blob(
    ['Nome do Aluno,E-mail,Órgão Público,Telefone,CPF,Função\n'],
    { type: 'text/csv;charset=utf-8;' },
  );
  const a = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(blob),
    download: 'modelo-participantes.csv',
  });
  a.click();
  URL.revokeObjectURL(a.href);
}
