'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Briefcase,
  Files,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import type { UserProfile } from '@/lib/auth-helpers';

interface DashboardShellProps {
  children: React.ReactNode;
  user: UserProfile | null;
}

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  enabled: boolean;
  matchExact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    enabled: true,
    matchExact: true,
  },
  {
    href: '/dashboard',
    icon: Briefcase,
    label: 'Active Deals',
    enabled: true,
  },
  { href: '#', icon: Files, label: 'Templates', enabled: false },
  { href: '#', icon: Users, label: 'Contacts', enabled: false },
  { href: '#', icon: Settings, label: 'Settings', enabled: false },
];

export default function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function isActive(item: NavItem) {
    if (item.matchExact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  const displayName = user?.fullName || user?.email || 'Agent';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Top Header ────────────────────────────── */}
      <header className="h-14 bg-surface-raised border-b border-border flex items-center justify-between px-4 lg:px-6 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-1.5 -ml-1 text-secondary hover:text-primary rounded-md"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <Link
            href="/dashboard"
            className="font-display text-xl text-navy tracking-tight"
          >
            Estora
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center">
              <span className="text-[10px] font-medium text-white">
                {initials}
              </span>
            </div>
            <span className="text-sm text-secondary max-w-[140px] truncate">
              {displayName}
            </span>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-1.5 text-secondary hover:text-error rounded-md transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Mobile Overlay ────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────── */}
      <aside
        className={`
          fixed top-14 bottom-0 left-0 z-30
          w-56 bg-surface-raised border-r border-border
          flex flex-col
          transition-transform duration-200 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <nav className="flex-1 py-3 px-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.label}
                href={item.enabled ? item.href : '#'}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm
                  transition-colors duration-100
                  ${
                    active
                      ? 'bg-surface-sunken text-navy font-medium'
                      : 'text-secondary hover:text-primary hover:bg-surface-sunken/50'
                  }
                  ${!item.enabled ? 'opacity-30 pointer-events-none' : ''}
                `}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <p className="text-[10px] text-disabled uppercase tracking-widest px-3">
            Estora AI
          </p>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────── */}
      <main className="pt-14 lg:pl-56 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
