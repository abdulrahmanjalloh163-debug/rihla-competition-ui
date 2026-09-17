'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ProgressResponse } from '../types';
import { GlassCard } from '../../components/GlassCard';
import { ProgressRing } from '../../components/ProgressRing';
import { StatusBadge } from '../../components/StatusBadge';
import { LEVEL_LABEL, GOAL_LABEL } from '../../lib/ui/labels';
import { storeLearnerId } from '../../lib/ui/learnerSession';

type ProgressTab = 'overview' | 'skills' | 'maintenance';

export default function ProgressPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProgressContent />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="page page-narrow flow-page">
      <div className="loader-stack"><span className="spinner" /><span>جاري بناء لوحة التقدّم...</span></div>
    </main>
  );
}

function toArabicNumber(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
}

function formatPercent(value: number): string {
  return `${toArabicNumber(Math.round(value))}٪`;
}

function ProgressContent() {
  const params = useSearchParams();
  const learnerId = params.get('learnerId') ?? '';
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ProgressTab>('overview');
  const [skillIndex, setSkillIndex] = useState(0);

  useEffect(() => {
    if (!learnerId) return;
    storeLearnerId(learnerId);
    let cancelled = false;

    fetch(`/api/progress?learnerId=${encodeURIComponent(learnerId)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'تعذّر تحميل التقدّم');
        return body as ProgressResponse;
      })
      .then((body) => { if (!cancelled) setData(body); })
      .catch((err) => { if (!cancelled) setError((err as Error).message); });

    return () => { cancelled = true; };
  }, [learnerId]);

  if (!learnerId) {
    return (
      <main className="page page-narrow flow-page">
        <GlassCard className="flow-card empty-state">ابدأ رحلتك أولًا لإنشاء لوحة تقدّم.</GlassCard>
      </main>
    );
  }

  if (error) {
    return <main className="page page-narrow flow-page"><p className="form-error">{error}</p></main>;
  }

  if (!data) return <Loading />;

  const average = data.weaknesses.length
    ? Math.round((data.weaknesses.reduce((sum, weakness) => sum + weakness.accuracy, 0) / data.weaknesses.length) * 100)
    : 0;
  const mastered = data.weaknesses.filter((weakness) => weakness.status === 'mastered').length;
  const totalSkills = data.weaknesses.length;
  const reviewCount = data.maintenanceReviews.length;
  const currentSkill = data.weaknesses[skillIndex];

  return (
    <main className="page flow-page" dir="rtl">
      <div className="flow-dashboard-shell">
        <div className="flow-dashboard-head">
          <div>
            <span className="eyebrow">ذكاء المتعلّم</span>
            <h1>مرحبًا، {data.learner.name}</h1>
          </div>
          <Link className="gradient-button" href={`/practice?learnerId=${encodeURIComponent(learnerId)}`}>تابع التدريب</Link>
        </div>

        <div className="flow-step-tabs progress-tabs">
          <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>نظرة عامة</button>
          <button className={tab === 'skills' ? 'active' : ''} onClick={() => setTab('skills')}>المهارات</button>
          <button className={tab === 'maintenance' ? 'active' : ''} onClick={() => setTab('maintenance')}>التثبيت</button>
        </div>

        {tab === 'overview' && (
          <GlassCard className="flow-card progress-overview-card emphasis">
            <div className="flow-overview-grid">
              <div className="flow-metric"><span>متوسط الدقة</span><strong dir="ltr">{formatPercent(average)}</strong></div>
              <div className="flow-metric"><span>المهارات المتقنة</span><strong>{toArabicNumber(mastered)} من {toArabicNumber(totalSkills)}</strong></div>
              <div className="flow-metric"><span>مراجعات التثبيت</span><strong>{toArabicNumber(reviewCount)}</strong></div>
              <div className="flow-metric"><span>المستوى</span><strong>{LEVEL_LABEL[data.learner.observed_level]}</strong></div>
            </div>
            <div className="flow-overview-footer">
              <div>
                <span className="field-label">هدفك الأساسي</span>
                <strong>{GOAL_LABEL[data.learner.learning_goal]}</strong>
              </div>
              <ProgressRing value={average} label="الدقة" />
            </div>
          </GlassCard>
        )}

        {tab === 'skills' && (
          <GlassCard className="flow-card emphasis">
            {currentSkill ? (
              <>
                <div className="flow-skill-top">
                  <div>
                    <span className="eyebrow">المهارة {toArabicNumber(skillIndex + 1)} من {toArabicNumber(totalSkills)}</span>
                    <h1>{currentSkill.category}</h1>
                    <p className="flow-muted">{toArabicNumber(currentSkill.relevant_question_count)} سؤالًا مرتبطًا بهذه المهارة</p>
                  </div>
                  <ProgressRing value={Math.round(currentSkill.accuracy * 100)} label="الدقة" />
                </div>
                <div className="flow-badge-wrap"><StatusBadge status={currentSkill.status} /></div>
                <div className="flow-nav-row">
                  <button className="gradient-button secondary" disabled={skillIndex === 0} onClick={() => setSkillIndex((i) => Math.max(0, i - 1))}>السابق</button>
                  <button className="gradient-button" disabled={skillIndex === totalSkills - 1} onClick={() => setSkillIndex((i) => Math.min(totalSkills - 1, i + 1))}>التالي</button>
                </div>
              </>
            ) : (
              <div className="empty-state">لم تبدأ متابعة المهارات بعد. أكمل التقييم التشخيصي أولًا.</div>
            )}
          </GlassCard>
        )}

        {tab === 'maintenance' && (
          <GlassCard className="flow-card emphasis">
            <span className="eyebrow">مراجعات التثبيت</span>
            <h1>{reviewCount ? 'رِحلة تتابع ثبات إتقانك' : 'لم تبدأ مراجعات التثبيت بعد'}</h1>
            <p className="flow-muted">
              {reviewCount
                ? `أكملت ${toArabicNumber(reviewCount)} مراجعة تثبيت حتى الآن. عندما تُتقن مهارة، تعود رِحلة إليها لاحقًا للتأكد من بقاء الإتقان.`
                : 'تبدأ مراجعات التثبيت بعد وصول مهارة إلى حالة مُتقَن. عندها تعود رِحلة إليها دوريًا للتأكد من ثبات الأداء.'}
            </p>
            {mastered > 0 && (
              <div className="flow-maintenance-highlight">
                <span>المهارات المتقنة حاليًا</span>
                <strong>{toArabicNumber(mastered)} من {toArabicNumber(totalSkills)}</strong>
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </main>
  );
}
