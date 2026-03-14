import React from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import EventWizard from '@/features/events/components/EventWizard';

export default function CriarEventoPage() {
  return (
    <AdminLayout title="Criar Evento" description="Crie um novo evento com participantes, palestrantes e templates.">
      <EventWizard />
    </AdminLayout>
  );
}
