import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

interface ParticipantRow {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  document?: string;
  badgeRole?: string;
}

interface ImportFullBody {
  event: {
    name: string;
    description?: string;
    location?: string;
    address?: string;
    city?: string;
    instructor?: string;
    workload?: number;
    capacity?: number;
    startDate: string;
    endDate: string;
    checkinWindowMinutes?: number;
    days?: { date: string; label?: string }[];
    attendanceRule?: { ruleType: string; minDays?: number | null };
  };
  participants: ParticipantRow[];
  badgeTemplateUrl?: string;
  certificateTemplateUrl?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  const isAdmin = session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN';
  if (!isAdmin) return res.status(403).json({ error: 'Apenas administradores' });

  const body = req.body as ImportFullBody;
  const { event: eventData, participants, badgeTemplateUrl, certificateTemplateUrl } = body;

  if (!eventData?.name || !eventData?.startDate || !eventData?.endDate) {
    return res.status(400).json({ error: 'Dados do evento incompletos' });
  }

  try {
    const companyId = (session.user as { companyId?: string })?.companyId;
    if (!companyId) return res.status(400).json({ error: 'Empresa não encontrada na sessão' });

    // 1. Criar o evento
    const event = await prisma.event.create({
      data: {
        name: eventData.name,
        description: eventData.description || null,
        location: eventData.location || null,
        address: eventData.address || null,
        city: eventData.city || null,
        instructor: eventData.instructor || null,
        workload: eventData.workload || null,
        capacity: eventData.capacity || null,
        startDate: new Date(eventData.startDate),
        endDate: new Date(eventData.endDate),
        checkinWindowMinutes: eventData.checkinWindowMinutes ?? 60,
        companyId,
        ...(eventData.days?.length
          ? { days: { create: eventData.days.map((d, i) => ({ date: new Date(d.date), label: d.label || `Dia ${i + 1}` })) } }
          : {}),
        ...(eventData.attendanceRule
          ? { attendanceRule: { create: { ruleType: eventData.attendanceRule.ruleType, minDays: eventData.attendanceRule.minDays ?? null } } }
          : {}),
      },
    });

    // 2. Registrar templates se enviados
    if (badgeTemplateUrl) {
      await prisma.badgeTemplate.create({
        data: { name: 'Template Importado', fileUrl: badgeTemplateUrl, eventId: event.id, isDefault: true },
      });
    }
    if (certificateTemplateUrl) {
      await prisma.certificateTemplate.create({
        data: { name: 'Certificado Importado', fileUrl: certificateTemplateUrl, eventId: event.id, isDefault: true },
      });
    }

    // 3. Importar participantes
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const cleanName = (name: string) => name.replace(/^\d+\.\s*/, '').trim();

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const seenInBatch = new Set<string>();

    for (const row of (participants ?? [])) {
      const name = cleanName((row.name ?? '').trim());
      const email = norm(row.email ?? '');
      if (!name || !email) { errors.push(`Linha inválida: ${JSON.stringify(row)}`); continue; }
      if (seenInBatch.has(email)) { skipped++; continue; }
      seenInBatch.add(email);

      try {
        const existing = await prisma.participant.findUnique({ where: { email_eventId: { email, eventId: event.id } } });
        if (existing) { skipped++; continue; }
        await prisma.participant.create({
          data: {
            name,
            email,
            company: row.company || null,
            phone: row.phone || null,
            document: row.document || null,
            badgeRole: row.badgeRole || 'Participante',
            eventId: event.id,
          },
        });
        created++;
      } catch (e) {
        errors.push(`${email}: ${String(e)}`);
      }
    }

    return res.json({ eventId: event.id, eventName: event.name, created, skipped, errors });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: `Erro interno: ${String(err)}` });
  }
}
