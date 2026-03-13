import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';
import { generateQrToken } from '@/server/qrToken';
import { sendBadgeEmail } from '@/server/emailService';
import { checkPlanLimit } from '@/server/planLimits';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  const isAdmin = session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN';

  if (req.method === 'GET') {
    const { eventId } = req.query;
    const participants = await prisma.participant.findMany({
      where: eventId ? { eventId: String(eventId) } : {},
      orderBy: { name: 'asc' },
      include: {
        checkins: { include: { eventDay: { select: { id: true, date: true, label: true } } } },
        certificate: true,
      },
    });
    return res.json(participants);
  }

  if (!isAdmin) return res.status(403).json({ error: 'Apenas administradores' });

  if (req.method === 'POST') {
    const { name, email, company, document, phone, badgeRole, eventId } = req.body;
    if (!name || !email || !eventId) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });

    const existing = await prisma.participant.findUnique({ where: { email_eventId: { email, eventId } } });
    if (existing) return res.status(409).json({ error: 'Participante já cadastrado neste evento' });

    // Plan limit check
    const companyId = session.user?.companyId;
    if (companyId) {
      const limit = await checkPlanLimit(companyId, 'participants');
      if (!limit.allowed) return res.status(402).json({ error: `Limite do plano atingido (${limit.current}/${limit.max} participantes). Faça upgrade do plano.` });
    }

    const id = crypto.randomUUID();
    const qrToken = generateQrToken(id, eventId);
    const participant = await prisma.participant.create({
      data: { id, name, email, company, document, phone, badgeRole: badgeRole ?? 'Participante', eventId, qrToken },
    });

    // Auto-create User account if email doesn't exist
    let generatedPassword: string | null = null;
    let isNewAccount = false;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      // Generate a readable temp password: Word + 4 digits
      const words = ['Acesso', 'Evento', 'Cracha', 'Porta', 'Login'];
      const word = words[Math.floor(Math.random() * words.length)];
      const digits = Math.floor(1000 + Math.random() * 9000);
      generatedPassword = `${word}${digits}`;
      const hashedPw = await bcrypt.hash(generatedPassword, 10);
      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPw,
          role: 'MEMBER',
          companyId: session.user?.companyId ?? null,
        },
      });
      isNewAccount = true;
    }

    // Send badge email (includes login credentials if new account)
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { name: true, startDate: true, location: true } });
    if (event) {
      sendBadgeEmail({
        to: email,
        participantName: name,
        eventName: event.name,
        eventDate: new Date(event.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        eventLocation: event.location ?? undefined,
        qrToken,
        badgeRole: badgeRole ?? 'Participante',
        loginPassword: generatedPassword ?? undefined,
        loginUrl: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
      }).catch(() => {});
    }

    return res.status(201).json({
      ...participant,
      _accountCreated: isNewAccount,
      _generatedPassword: generatedPassword,
    });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
