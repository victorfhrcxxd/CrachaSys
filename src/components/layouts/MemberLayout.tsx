import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Award,
  CreditCard,
  User,
  Menu,
  X,
  LogOut,
  BookOpen,
  ScanLine,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const memberNav = [
  { href: '/portal', label: 'Início', icon: LayoutDashboard },
  { href: '/portal/courses', label: 'Meus Cursos', icon: BookOpen },
  { href: '/portal/badge', label: 'Meu Crachá', icon: CreditCard },
  { href: '/portal/certificates', label: 'Certificados', icon: Award },
  { href: '/portal/profile', label: 'Meu Perfil', icon: User },
];

const staffNav = [
  { href: '/portal', label: 'Painel', icon: LayoutDashboard },
  { href: '/checkin', label: 'Scanner Check-in', icon: ScanLine },
  { href: '/portal/register', label: 'Cadastrar Participante', icon: UserPlus },
  { href: '/portal/profile', label: 'Meu Perfil', icon: User },
];

interface MemberLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function MemberLayout({ children, title = 'Portal do Participante' }: MemberLayoutProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isStaff = session?.user?.role === 'CREDENTIAL_STAFF';
  const navItems = isStaff ? staffNav : memberNav;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30 transition-transform duration-300 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">CrachaSys</p>
            <p className="text-xs text-gray-500 mt-0.5">{isStaff ? 'Portal da Staff' : 'Portal do Participante'}</p>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-600"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/portal'
                ? router.pathname === '/portal'
                : router.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn('w-5 h-5', isActive ? 'text-indigo-600' : 'text-gray-400')}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
              {session?.user?.name?.[0]?.toUpperCase() ?? 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session?.user?.name ?? 'Participante'}
              </p>
              <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 lg:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
