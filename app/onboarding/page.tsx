'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ArabicLevel, LearningGoal } from '../../lib/types';
import { GlassCard } from '../../components/GlassCard';
import { GOAL_LABEL, LEVEL_LABEL } from '../../lib/ui/labels';
import { storeLearnerId } from '../../lib/ui/learnerSession';

const LEVELS: ArabicLevel[] = ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced'];
const GOALS: LearningGoal[] = ['Speaking', 'Writing', 'Reading', 'Understanding Arabic', 'General Arabic'];

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [level, setLevel] = useState<ArabicLevel>('Intermediate');
  const [goal, setGoal] = useState<LearningGoal>('Writing');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, self_reported_level: level, learning_goal: goal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'تعذّر إنشاء ملف المتعلّم');
      storeLearnerId(data.learner.id);
      router.push(`/diagnostic?learnerId=${data.learner.id}`);
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
          <span className="ai-chip"><i /> بداية الرحلة</span>
          <h1>لنبنِ ملفك اللغوي</h1>
          <p>أخبر رِحلة بمستواك وهدفك. بعد ذلك تبدأ بتقييم قصير يساعد النظام على بناء أول صورة عن أدائك.</p>
          <div className="steps" style={{ gridTemplateColumns: '1fr', marginTop: 24 }}>
            <article className="step-card"><strong>خصوصية النموذج الأولي</strong><small>يُحفظ معرّف المتعلّم محليًا في هذا المتصفح لتتمكن من متابعة رحلتك عند العودة.</small></article>
          </div>
        </GlassCard>

        <GlassCard className="form-card emphasis">
          <div className="section-head"><div><span className="eyebrow">LEARNER PROFILE</span><h2>إعداد المتعلّم</h2></div></div>
          <form onSubmit={handleSubmit} className="form-stack">
            <label><span className="field-label">الاسم</span><input className="tech-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="اكتب اسمك" required /></label>
            <div><span className="field-label">مستواك الحالي</span><div className="choice-grid">{LEVELS.map((item) => <button type="button" key={item} className={`choice-pill ${level === item ? 'active' : ''}`} onClick={() => setLevel(item)}>{LEVEL_LABEL[item]}</button>)}</div></div>
            <div><span className="field-label">هدفك الأساسي</span><div className="choice-grid">{GOALS.map((item) => <button type="button" key={item} className={`choice-pill ${goal === item ? 'active' : ''}`} onClick={() => setGoal(item)}>{GOAL_LABEL[item]}</button>)}</div></div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" disabled={loading} className="gradient-button">{loading ? 'جاري إنشاء رحلتك...' : 'ابدأ التقييم'}</button>
          </form>
        </GlassCard>
      </div>
    </main>
  );
}
