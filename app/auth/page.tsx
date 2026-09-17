'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '../../components/GlassCard';
import { getBrowserSupabase } from '../../lib/auth/browserClient';
import { storeLearnerId } from '../../lib/ui/learnerSession';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function continueAfterAuth(accessToken: string) {
    const res = await fetch('/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? 'تعذّر تحميل ملف المتعلّم');
    }

    if (data.learner?.id) {
      storeLearnerId(data.learner.id);
      router.push(`/practice?learnerId=${encodeURIComponent(data.learner.id)}`);
      return;
    }

    router.push('/onboarding');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const supabase = getBrowserSupabase();

      if (mode === 'signin') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        if (!data.session) throw new Error('تعذّر إنشاء جلسة تسجيل الدخول');

        await continueAfterAuth(data.session.access_token);
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (authError) throw authError;

      if (data.session) {
        await continueAfterAuth(data.session.access_token);
        return;
      }

      setMessage('تم إنشاء الحساب. افتح بريدك الإلكتروني وأكّد الحساب، ثم ارجع وسجّل الدخول.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page" dir="rtl">
      <div className="onboarding-wrap">
        <GlassCard className="onboarding-copy">
          <span className="ai-chip"><i /> حساب رِحلة</span>
          <h1>رحلتك معك على كل أجهزتك</h1>
          <p>
            سجّل الدخول لتحتفظ بتقدّمك وتتابع رحلتك من الهاتف أو الكمبيوتر بالحساب نفسه.
          </p>
        </GlassCard>

        <GlassCard className="form-card emphasis">
          <div className="section-head">
            <div>
              <span className="eyebrow">RIHLA ACCOUNT</span>
              <h2>{mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-stack">
            <label>
              <span className="field-label">البريد الإلكتروني</span>
              <input
                className="tech-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                dir="ltr"
                required
              />
            </label>

            <label>
              <span className="field-label">كلمة المرور</span>
              <input
                className="tech-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>

            {error && <p className="form-error">{error}</p>}
            {message && <p>{message}</p>}

            <button type="submit" disabled={loading} className="gradient-button">
              {loading
                ? 'جارٍ التحميل...'
                : mode === 'signin'
                  ? 'تسجيل الدخول'
                  : 'إنشاء الحساب'}
            </button>

            <button
              type="button"
              className="choice-pill"
              onClick={() => {
                setError(null);
                setMessage(null);
                setMode(mode === 'signin' ? 'signup' : 'signin');
              }}
            >
              {mode === 'signin'
                ? 'ليس لديك حساب؟ أنشئ حسابًا'
                : 'لديك حساب؟ سجّل الدخول'}
            </button>
          </form>
        </GlassCard>
      </div>
    </main>
  );
}
