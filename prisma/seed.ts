import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPwd = await bcrypt.hash('admin123', 12);
  const staffPwd = await bcrypt.hash('staff123', 12);

  // Company
  const company = await prisma.company.upsert({
    where: { slug: 'instituto-capacitacao' },
    update: {},
    create: {
      name: 'Instituto de Capacitação',
      slug: 'instituto-capacitacao',
      plan: 'PRO',
    },
  });

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@sistema.com',
      password: adminPwd,
      role: 'ADMIN',
      companyId: company.id,
    },
  });

  // Credential staff user
  await prisma.user.upsert({
    where: { email: 'staff@sistema.com' },
    update: {},
    create: {
      name: 'Credenciador',
      email: 'staff@sistema.com',
      password: staffPwd,
      role: 'CREDENTIAL_STAFF',
      companyId: company.id,
    },
  });

  // Event 1 — completed
  const event1 = await prisma.event.upsert({
    where: { id: 'event-seed-001' },
    update: {},
    create: {
      id: 'event-seed-001',
      name: 'Fundamentos de Gestão de Projetos',
      description: 'Aprenda os fundamentos da gestão de projetos com metodologias ágeis e tradicionais.',
      location: 'Auditório Principal - Bloco A',
      address: 'Rua das Flores, 123',
      city: 'São Paulo',
      instructor: 'Prof. Carlos Mendes',
      workload: 24,
      capacity: 50,
      startDate: new Date('2025-03-15T08:00:00'),
      endDate: new Date('2025-03-17T18:00:00'),
      status: 'COMPLETED',
      companyId: company.id,
    },
  });

  // Event days for event1
  const day1 = await prisma.eventDay.upsert({
    where: { id: 'day-seed-001' },
    update: {},
    create: { id: 'day-seed-001', date: new Date('2025-03-15T08:00:00'), label: 'Dia 1', eventId: event1.id },
  });
  const day2 = await prisma.eventDay.upsert({
    where: { id: 'day-seed-002' },
    update: {},
    create: { id: 'day-seed-002', date: new Date('2025-03-16T08:00:00'), label: 'Dia 2', eventId: event1.id },
  });
  const day3 = await prisma.eventDay.upsert({
    where: { id: 'day-seed-003' },
    update: {},
    create: { id: 'day-seed-003', date: new Date('2025-03-17T08:00:00'), label: 'Dia 3', eventId: event1.id },
  });

  // Attendance rule
  await prisma.attendanceRule.upsert({
    where: { eventId: event1.id },
    update: {},
    create: { eventId: event1.id, ruleType: 'ALL_DAYS' },
  });

  // Event 2 — upcoming
  const event2 = await prisma.event.upsert({
    where: { id: 'event-seed-002' },
    update: {},
    create: {
      id: 'event-seed-002',
      name: 'Liderança e Comunicação Eficaz',
      description: 'Desenvolva habilidades de liderança e comunicação para o ambiente corporativo.',
      location: 'Sala de Conferências B - 2º Andar',
      address: 'Av. Paulista, 900',
      city: 'São Paulo',
      instructor: 'Prof.ª Ana Beatriz Costa',
      workload: 16,
      capacity: 30,
      startDate: new Date('2026-05-20T08:00:00'),
      endDate: new Date('2026-05-22T18:00:00'),
      status: 'UPCOMING',
      companyId: company.id,
    },
  });

  await prisma.eventDay.upsert({
    where: { id: 'day-seed-004' },
    update: {},
    create: { id: 'day-seed-004', date: new Date('2026-05-20T08:00:00'), label: 'Dia 1', eventId: event2.id },
  });
  await prisma.eventDay.upsert({
    where: { id: 'day-seed-005' },
    update: {},
    create: { id: 'day-seed-005', date: new Date('2026-05-21T08:00:00'), label: 'Dia 2', eventId: event2.id },
  });

  // Participants for event1
  const p1 = await prisma.participant.upsert({
    where: { email_eventId: { email: 'joao.silva@email.com', eventId: event1.id } },
    update: {},
    create: {
      name: 'João da Silva',
      email: 'joao.silva@email.com',
      company: 'Empresa ABC Ltda',
      document: '123.456.789-00',
      phone: '(11) 99999-0001',
      badgeRole: 'Participante',
      eventId: event1.id,
    },
  });
  const p2 = await prisma.participant.upsert({
    where: { email_eventId: { email: 'maria.souza@email.com', eventId: event1.id } },
    update: {},
    create: {
      name: 'Maria Souza',
      email: 'maria.souza@email.com',
      company: 'Consultoria XYZ',
      document: '987.654.321-00',
      phone: '(11) 99999-0002',
      badgeRole: 'Participante',
      eventId: event1.id,
    },
  });
  const p3 = await prisma.participant.upsert({
    where: { email_eventId: { email: 'pedro.alves@email.com', eventId: event1.id } },
    update: {},
    create: {
      name: 'Pedro Alves',
      email: 'pedro.alves@email.com',
      company: 'Tech Solutions',
      document: '555.444.333-22',
      badgeRole: 'Palestrante',
      eventId: event1.id,
    },
  });

  // Check-ins (p1 attended all 3 days, p2 attended 2 days, p3 none)
  for (const day of [day1, day2, day3]) {
    await prisma.checkIn.upsert({
      where: { participantId_eventDayId: { participantId: p1.id, eventDayId: day.id } },
      update: {},
      create: { participantId: p1.id, eventDayId: day.id, checkedInById: admin.id },
    });
  }
  for (const day of [day1, day2]) {
    await prisma.checkIn.upsert({
      where: { participantId_eventDayId: { participantId: p2.id, eventDayId: day.id } },
      update: {},
      create: { participantId: p2.id, eventDayId: day.id, checkedInById: admin.id },
    });
  }

  // Certificate for p1 (attended all days)
  await prisma.certificate.upsert({
    where: { participantId: p1.id },
    update: {},
    create: {
      participantId: p1.id,
      eventId: event1.id,
      verificationCode: 'VERIFY-JOAO-2025-001',
    },
  });

  console.log('✅ Seed executado com sucesso!');
  console.log('');
  console.log('Credenciais:');
  console.log('  Admin:  admin@sistema.com  / admin123');
  console.log('  Staff:  staff@sistema.com  / staff123');
  console.log('');
  console.log('Empresa:', company.name);
  console.log('Eventos:', event1.name, '|', event2.name);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
