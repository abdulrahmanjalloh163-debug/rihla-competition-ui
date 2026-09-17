'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { useStoredLearnerId } from '../lib/ui/learnerSession';

export function AppShell({ children }: { children: ReactNode }) {
  const learnerId = useStoredLearnerId();
  const pathname = usePathname();

  const practiceHref = learnerId
    ? `/practice?learnerId=${encodeURIComponent(learnerId)}`
    : '/auth';

  const progressHref = learnerId
    ? `/progress?learnerId=${encodeURIComponent(learnerId)}`
    : '/auth';

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar" dir="rtl">
        <Logo compact />

        <nav className="main-nav" aria-label="التنقل الرئيسي">
          <Link
            className={pathname === '/' ? 'active' : ''}
            href="/"
            aria-current={pathname === '/' ? 'page' : undefined}
          >
            الرئيسية
          </Link>
          <Link
            className={pathname === '/practice' ? 'active' : ''}
            href={practiceHref}
            aria-current={pathname === '/practice' ? 'page' : undefined}
          >
            التدريب
          </Link>
          <Link
            className={pathname === '/progress' ? 'active' : ''}
            href={progressHref}
            aria-current={pathname === '/progress' ? 'page' : undefined}
          >
            التقدّم
          </Link>
        </nav>

        <div className="nav-actions">
          <Link
            className={`account-button ${pathname === '/account' ? 'active' : ''}`}
            href="/account"
            aria-current={pathname === '/account' ? 'page' : undefined}
          >
            <span className="account-dot" aria-hidden="true" />
            حسابي
          </Link>
          <span className="ai-chip mini"><i /> AI</span>
        </div>
      </header>

      <div className="shell-content">{children}</div>

      <footer className="footer-note" dir="rtl">
        <span>رِحلة — نظام ذكي تكيّفي لتعلّم اللغة العربية</span>
        <span className="dot-sep">•</span>
        <span>نموذج أولي تعليمي</span>
      </footer>
    </div>
  );
}
