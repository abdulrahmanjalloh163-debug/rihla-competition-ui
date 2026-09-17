'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { clearStoredLearnerId, useStoredLearnerId } from '../lib/ui/learnerSession';

export function AppShell({ children }: { children: ReactNode }) {
  const learnerId = useStoredLearnerId();
  const pathname = usePathname();
  const router = useRouter();

  const practiceHref = learnerId ? `/practice?learnerId=${encodeURIComponent(learnerId)}` : '/onboarding';
  const progressHref = learnerId ? `/progress?learnerId=${encodeURIComponent(learnerId)}` : '/onboarding';

  function resetJourney() {
    if (!window.confirm('هل تريد بدء رحلة جديدة؟ لن تُحذف بياناتك القديمة من قاعدة البيانات.')) return;
    clearStoredLearnerId();
    router.push('/onboarding');
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar" dir="rtl">
        <Logo compact />
        <nav className="main-nav" aria-label="التنقل الرئيسي">
          <Link className={pathname === '/' ? 'active' : ''} href="/">الرئيسية</Link>
          <Link className={pathname === '/practice' ? 'active' : ''} href={practiceHref}>التدريب</Link>
          <Link className={pathname === '/progress' ? 'active' : ''} href={progressHref}>التقدّم</Link>
        </nav>
        <div className="nav-actions">
          {learnerId && (
            <button className="text-button" onClick={resetJourney} type="button">رحلة جديدة</button>
          )}
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
