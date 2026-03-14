import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  Award,
  Menu,
  X,
  LogOut,
  CreditCard,
  QrCode,
  BarChart3,
  ShieldCheck,
  FolderInput,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useSelectedEvent } from '@/contexts/EventContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mainNav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/events', label: 'Eventos', icon: CalendarDays },
  { href: '/admin/criar-evento', label: 'Criar Evento', icon: FolderInput, exact: true },
  { href: '/admin/participants', label: 'Participantes', icon: Users },
  { href: '/checkin', label: 'Check-in QR', icon: QrCode },
];

const toolsNav = [
  { href: '/admin/badges', label: 'Crachás', icon: CreditCard },
  { href: '/admin/certificates', label: 'Certificados', icon: Award },
  { href: '/admin/reports', label: 'Relatórios', icon: BarChart3 },
  { href: '/admin/users', label: 'Usuários', icon: UserCog },
  { href: '/admin/audit', label: 'Auditoria', icon: ShieldCheck },
];

// Páginas onde o seletor de evento aparece no header
const EVENT_SELECTOR_PATHS = [
  '/admin',
  '/admin/badges',
  '/admin/certificates',
  '/admin/reports',
  '/admin/participants',
];

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  onClick?: () => void;
}

function NavItem({ href, label, icon: Icon, exact, onClick }: NavItemProps) {
  const router = useRouter();
  const isActive = exact ? router.pathname === href : router.pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-100',
        isActive
          ? 'bg-primary-subtle text-sidebar-active-fg'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
      )}
    >
      <Icon
        className={cn(
          'w-[15px] h-[15px] flex-shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-foreground'
        )}
      />
      {label}
    </Link>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function AdminLayout({ children, title, description, actions }: AdminLayoutProps) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { events, selectedEventId, setSelectedEventId } = useSelectedEvent();

  const showEventSelector = EVENT_SELECTOR_PATHS.some(p =>
    p === '/admin' ? router.pathname === p : router.pathname.startsWith(p)
  );

  const initials =
    session?.user?.name
      ?.split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() ?? 'A';

  const close = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-[216px] bg-sidebar border-r border-sidebar-border z-30 flex flex-col transition-transform duration-200 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 h-[54px] px-4 border-b border-sidebar-border flex-shrink-0">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-[13px] text-foreground tracking-tight">CrachaSys</span>
          <button
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
            onClick={close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-hide">
          {mainNav.map((item) => (
            <NavItem key={item.href} {...item} onClick={close} />
          ))}

          <div className="pt-4 pb-1 px-2">
            <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
              Ferramentas
            </p>
          </div>

          {toolsNav.map((item) => (
            <NavItem key={item.href} {...item} onClick={close} />
          ))}
        </nav>

        {/* User */}
        <div className="px-2 pb-3 pt-2 border-t border-sidebar-border flex-shrink-0 space-y-0.5">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground truncate leading-none">
                {session?.user?.name ?? 'Administrador'}
              </p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive-subtle transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:pl-[216px] flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-10 h-[54px] bg-surface/90 backdrop-blur-md border-b border-border flex items-center px-4 lg:px-6 gap-3">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-[13px] font-semibold text-foreground leading-none truncate">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{description}</p>
            )}
          </div>

          {/* ── Seletor de Evento Global ── */}
          {showEventSelector && events.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground hidden sm:block flex-shrink-0" />
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="h-7 w-[180px] sm:w-[220px] text-[12px] border-border bg-muted/40 hover:bg-muted transition-colors focus:ring-1">
                  <SelectValue placeholder="Selecionar evento..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-[13px]">
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
