export interface EventDay {
  date:  string;
  label: string;
}

export function generateEventDays(startDate: string, endDate: string): EventDay[] {
  if (!startDate || !endDate) return [];

  const start = new Date(startDate);
  const end   = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

  const days: EventDay[] = [];
  const cur  = new Date(start.toISOString().slice(0, 10));
  const last = new Date(end.toISOString().slice(0, 10));
  let i = 1;

  while (cur <= last && days.length < 31) {
    days.push({ date: cur.toISOString().slice(0, 10), label: `Dia ${i++}` });
    cur.setDate(cur.getDate() + 1);
  }

  return days;
}
