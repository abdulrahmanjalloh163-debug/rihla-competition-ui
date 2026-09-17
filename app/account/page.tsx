'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '../../components/GlassCard';
import { getBrowserSupabase } from '../../lib/auth/browserClient';
import { clearStoredLearnerId } from '../../lib/ui/learnerSession';

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const supabase = getBrowserSupabase();
        const { data, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!data.user) {
          router.replace('/auth');
          return;
        }

        if (!cancelled) {
          setEmail(data.user.email ?? '');
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);

    try {
      const supabase = getBrowserSupabase();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) throw signOutError;

      clearStoredLearnerId();
      router.replace('/auth');
    } catch (err) {
      setError((err as Error).message);
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <main className="page page-narrow" dir="rtl">
        <GlassCard className="empty-state">جاري تحميل حسابك...</GlassCard>
      </main>
    );
  }

  return (
    <main className="page page-narrow" dir="rtl">
      <GlassCard className="form-card emphasis">
        <span className="ai-chip"><i /> حساب رِحلة</span>
        <h1 style={{ marginTop: 18 }}>حسابي</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
          تقدّمك مرتبط بهذا الحساب، ويمكنك متابعة رحلتك من أي جهاز بعد تسجيل الدخول.
        </p>

        <div className="mini-stat" style={{ marginTop: 24 }}>
          <span>البريد الإلكتروني</span>
          <strong dir="ltr">{email || '—'}</strong>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button
          type="button"
          className="gradient-button"
          onClick={handleSignOut}
          disabled={signingOut}
          style={{ marginTop: 24 }}
        >
          {signingOut ? 'جاري تسجيل الخروج...' : 'تسجيل الخروج'}
        </button>
      </GlassCard>
    </main>
  );
}
