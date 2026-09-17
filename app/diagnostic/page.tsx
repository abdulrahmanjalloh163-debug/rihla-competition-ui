'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { DiagnosticAnalyzeResponse } from '../types';
import { GlassCard } from '../../components/GlassCard';
import { ConfidenceMeter } from '../../components/ConfidenceMeter';
import { ProgressRing } from '../../components/ProgressRing';
import { StatusBadge } from '../../components/StatusBadge';
import { storeLearnerId } from '../../lib/ui/learnerSession';
import { adaptiveReasonAr } from '../../lib/ui/labels';

const LOADING_MESSAGES = ['جاري تحليل لغتك...', 'تحليل التراكيب', 'اكتشاف الأنماط', 'بناء ملفك اللغوي'];
const RESULT_STEPS = ['الملخص', 'نقاط القوة', 'الأخطاء', 'القرار'];

export default function DiagnosticPage() {
  return (
    <Suspense fallback={<LoadingPage text="جاري تحميل التقييم..." />}>
      <DiagnosticForm />
    </Suspense>
  );
}

function LoadingPage({ text }: { text: string }) {
  return (
    <main className="page page-narrow flow-page">
      <div className="loader-stack"><span className="spinner" /><span>{text}</span></div>
    </main>
  );
}

function DiagnosticForm() {
  const params = useSearchParams();
  const learnerId = params.get('learnerId') ?? '';
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticAnalyzeResponse | null>(null);
  const [resultStep, setResultStep] = useState(0);
  const [errorIndex, setErrorIndex] = useState(0);

  useEffect(() => { if (learnerId) storeLearnerId(learnerId); }, [learnerId]);
  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setLoadingIndex((i) => (i + 1) % LOADING_MESSAGES.length), 1100);
    return () => window.clearInterval(timer);
  }, [loading]);

  const sentenceCount = useMemo(
    () => text.split(/[.!؟\n]+/).map((s) => s.trim()).filter(Boolean).length,
    [text]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setLoadingIndex(0);
    setResult(null);
    setResultStep(0);
    setErrorIndex(0);

    try {
      const res = await fetch('/api/diagnostic/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'فشل التحليل');
      setResult(data as DiagnosticAnalyzeResponse);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!result) {
    return (
      <main className="page page-narrow flow-page" dir="rtl">
        <GlassCard className="flow-card diagnostic-card emphasis">
          <div className="flow-screen-head">
            <div>
              <span className="ai-chip"><i /> تحليل المستوى</span>
              <h1>لِنبدأ بتعرُّف مستواك</h1>
              <p>اكتب خمس جمل عن يومك، ودع رِحلة تبحث عن الأنماط المهمة.</p>
            </div>
            <span className="page-kicker">{sentenceCount}/5 جمل</span>
          </div>

          <form onSubmit={handleSubmit} className="form-stack flow-diagnostic-form">
            <textarea
              className="tech-textarea flow-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="استيقظتُ في الصباح..."
              required
              disabled={loading}
            />
            {error && <p className="form-error">{error}</p>}
            {loading ? (
              <div className="analyzing-box"><span className="spinner" /><span>{LOADING_MESSAGES[loadingIndex]}</span></div>
            ) : (
              <button type="submit" className="gradient-button">حلّل إجابتي</button>
            )}
          </form>
        </GlassCard>
      </main>
    );
  }

  const currentError = result.errors[errorIndex];

  return (
    <main className="page page-narrow flow-page" dir="rtl">
      <div className="flow-result-shell">
        <div className="flow-step-tabs">
          {RESULT_STEPS.map((label, index) => (
            <button key={label} className={resultStep === index ? 'active' : ''} onClick={() => setResultStep(index)}>
              {label}
            </button>
          ))}
        </div>

        {resultStep === 0 && (
          <GlassCard className="flow-card result-card emphasis">
            <span className="eyebrow">ملخص التحليل</span>
            <h1>هذه أول صورة عن مستواك</h1>
            <p className="flow-muted flow-large-text">{result.analysis.overall_feedback_ar}</p>
            <button className="gradient-button flow-primary" onClick={() => setResultStep(1)}>التالي: نقاط القوة</button>
          </GlassCard>
        )}

        {resultStep === 1 && (
          <GlassCard className="flow-card result-card emphasis">
            <span className="eyebrow">نقاط القوة</span>
            <h1>ما الذي تفعله جيدًا؟</h1>
            <div className="flow-strength-grid">
              {result.analysis.strengths.map((strength, index) => (
                <div key={index} className="flow-strength-item"><span>✓</span><p>{strength}</p></div>
              ))}
            </div>
            <div className="flow-nav-row">
              <button className="gradient-button secondary" onClick={() => setResultStep(0)}>السابق</button>
              <button className="gradient-button" onClick={() => setResultStep(2)}>التالي: الأخطاء</button>
            </div>
          </GlassCard>
        )}

        {resultStep === 2 && (
          <GlassCard className="flow-card result-card emphasis">
            <span className="eyebrow">الأخطاء المكتشفة</span>
            <h1>{result.errors.length ? `النمط ${errorIndex + 1} من ${result.errors.length}` : 'لا توجد أخطاء مكتشفة'}</h1>

            {currentError ? (
              <div className="error-card flow-error-card">
                <div className="error-top">
                  <span className="category-pill">{currentError.category}</span>
                  <ConfidenceMeter value={currentError.confidence} />
                </div>
                <div className="error-original">{currentError.original_text}</div>
                <div className="error-correction">✓ {currentError.correction}</div>
                <p className="error-explain">{currentError.explanation_ar}</p>
              </div>
            ) : (
              <div className="empty-state">لا توجد أخطاء مكتشفة في الفئات الأساسية.</div>
            )}

            <div className="flow-nav-row">
              <button
                className="gradient-button secondary"
                onClick={() => {
                  if (errorIndex > 0) setErrorIndex((i) => i - 1);
                  else setResultStep(1);
                }}
              >
                السابق
              </button>
              <button
                className="gradient-button"
                onClick={() => {
                  if (errorIndex < result.errors.length - 1) setErrorIndex((i) => i + 1);
                  else setResultStep(3);
                }}
              >
                {errorIndex < result.errors.length - 1 ? 'الخطأ التالي' : 'القرار التكيّفي'}
              </button>
            </div>
          </GlassCard>
        )}

        {resultStep === 3 && (
          <GlassCard className="flow-card decision-card emphasis">
            <div>
              <span className="eyebrow">القرار التكيّفي</span>
              <div className="flow-badge-wrap"><StatusBadge action={result.decision.action} /></div>
              <h1>{result.decision.category ?? 'الخطوة التالية'}</h1>
              <p className="flow-muted">{adaptiveReasonAr(result.decision)}</p>
              <Link href={`/practice?learnerId=${encodeURIComponent(learnerId)}`} className="gradient-button">ابدأ التدريب المخصص</Link>
            </div>
            <ProgressRing value={(result.weaknesses.find((w) => w.category === result.decision.category)?.accuracy ?? 0) * 100} label="الدقة" />
          </GlassCard>
        )}
      </div>
    </main>
  );
}
