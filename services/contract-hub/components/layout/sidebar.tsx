'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  LayoutDashboard,
  FileText,
  FileSignature,
  Briefcase,
  Building2,
  CheckCircle2,
  Sparkles,
  Settings,
  Menu,
  X,
  Scale,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  userName: string;
  userEmail: string;
  userInitials: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Contracts', href: '/dashboard/contracts', icon: FileSignature },
  { name: 'Matters', href: '/dashboard/matters', icon: Briefcase },
  { name: 'Vendors', href: '/dashboard/vendors', icon: Building2 },
  { name: 'Approvals', href: '/dashboard/approvals', icon: CheckCircle2 },
  { name: 'AI Analysis', href: '/dashboard/ai', icon: Sparkles },
  { name: 'Semantic Search', href: '/dashboard/vector-search', icon: Search },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar({ userName, userEmail, userInitials }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/dashboard/';
    }
    return pathname.startsWith(href);
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen((p) => !p);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={toggleMobileMenu}
        className="fixed left-4 top-4 z-50 rounded-lg bg-[var(--deep)] p-2 text-[var(--text-primary)] transition-colors hover:bg-[var(--elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] md:hidden"
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5" strokeWidth={2} />
        ) : (
          <Menu className="h-5 w-5" strokeWidth={2} />
        )}
      </button>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-shrink-0 flex-col bg-[var(--background)] text-[var(--text-primary)] border-r border-[var(--border)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:static md:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 flex-shrink-0 items-center border-b border-[var(--border)] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]">
              <Scale className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[0.9375rem] font-bold leading-tight tracking-tight">
                Contract Hub
              </h1>
              <p className="truncate font-mono text-[10px] leading-tight text-[var(--text-tertiary)]">
                CCG Australia
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobileMenu}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-[0.8125rem] font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
                  active
                    ? 'border-l-[var(--accent)] bg-[var(--deep)] pl-[calc(0.75rem-3px)] text-[var(--text-primary)]'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--deep)] hover:text-[var(--text-primary)]'
                )}
              >
                <Icon className="h-[1.125rem] w-[1.125rem] flex-shrink-0" strokeWidth={1.5} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0">
          <div className="border-t border-[var(--border)] px-4 py-2">
            <p className="text-center font-mono text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
              Corporate Carbon Group Australia
            </p>
          </div>

          <div className="border-t border-[var(--border)] px-3 py-3">
            <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--elevated)] text-[0.8125rem] font-medium text-[var(--text-primary)]">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-medium text-[var(--text-primary)]">{userName}</p>
                <p className="truncate font-mono text-[0.6875rem] text-[var(--text-tertiary)]">{userEmail}</p>
              </div>
              <ThemeToggle compact />
              <UserButton />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
