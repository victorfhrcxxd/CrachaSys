import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function computeEventStatus(startDate: string | Date, endDate: string | Date): string {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now < start) return 'UPCOMING';
  if (now > end) return 'COMPLETED';
  return 'ONGOING';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    UPCOMING: 'Próximo',
    ONGOING: 'Em Andamento',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
  };
  return labels[status] ?? status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    UPCOMING: 'bg-blue-100 text-blue-800',
    ONGOING: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-800';
}

export function getBadgeRoleColor(role: string): string {
  const colors: Record<string, string> = {
    Palestrante: '#7c3aed',
    Organizador: '#dc2626',
    Staff: '#16a34a',
    Participante: '#2563eb',
    Instrutor: '#ea580c',
  };
  return colors[role] ?? '#2563eb';
}
