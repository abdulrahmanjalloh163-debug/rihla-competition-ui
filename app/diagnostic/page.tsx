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

export default function DiagnosticPage() {
  return <Suspense fallback={<LoadingPage text="جاري تحميل التقييم..." />}><DiagnosticForm /></Suspense>;
}

function LoadingPage({ text }: { text: string }) {
  return <main className="page loader-page"><div className="loader-stack"><span className="spinner" /><span>{text}</span></div></main>;
}

function DiagnosticForm() {
  const params = useSearchParams();
  const learnerId = params.get('learnerId') ?? '';
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticAnalyzeResponse | null>(null);

  useEffect(() => { if (learnerId) storeLearnerId(learnerId); }, [learnerId]);
  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setLoadingIndex((i) => (i + 1) % LOADING_MESSAGES.length), 1100);
    return () => window.clearInterval(timer);
  }, [loading]);

  const sentenceCount = useMemo(() => text.split(/[.!؟\n]+/).map((s) => s.trim()).filter(Boolean).length, [text]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true); setLoadingIndex(0); setResult(null);
    try {
      const res = await fetch('/api/diagnostic/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ learnerId, text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'فشل التحليل');
      setResult(data as DiagnosticAnalyzeResponse);
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }

  return (
    <main className="page page-narrow" dir="rtl">
      <div className="diagnostic-hero">
        <span className="ai-chip"><i /> تحليل المستوى</span>
        <h1>لِنبدأ بتعرُّف مستواك</h1>
        <p>اكتب خمس جمل عن يومك، ودع رِحلة تبحث عن الأنماط التي تستحق الانتباه.</p>
      </div>

      {!result && (
        <GlassCard className="diagnostic-card emphasis">
          <form onSubmit={handleSubmit} className="form-stack">
            <div>
              <div className="section-head" style={{ marginBottom: 10 }}><span className="field-label">كتابتك العربية</span><span className="page-kicker">{sentenceCount}/5 جمل</span></div>
              <textarea className="tech-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="استيقظتُ في الصباح..." required disabled={loading} />
            </div>
            {error && <p className="form-error">{error}</p>}
            {loading ? <div className="analyzing-box"><span className="spinner" /><span>{LOADING_MESSAGES[loadingIndex]}</span></div> : <button type="submit" className="gradient-button">حلّل إجابتي</button>}
          </form>
        </GlassCard>
      )}

      {result && (
        <div className="result-stack">
          <GlassCard className="result-card"><span className="eyebrow">ANALYSIS SUMMARY</span><h2>ملخص التحليل</h2><p style={{ color: 'var(--muted)', lineHeight: 1.9 }}>{result.analysis.overall_feedback_ar}</p></GlassCard>
          <GlassCard className="result-card"><span className="eyebrow">STRENGTHS</span><h2>نقاط القوة</h2><ul className="strength-list">{result.analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></GlassCard>
          <GlassCard className="result-card"><span className="eyebrow">DETECTED PATTERNS</span><h2>الأخطاء المكتشفة</h2>{result.errors.length === 0 ? <div className="empty-state">لا توجد أخطاء مكتشفة في الفئات الأساسية.</div> : result.errors.map((err) => <article key={err.id} className="error-card"><div className="error-top"><span className="category-pill">{err.category}</span><ConfidenceMeter value={err.confidence} /></div><div className="error-original">{err.original_text}</div><div className="error-correction">✓ {err.correction}</div><p className="error-explain">{err.explanation_ar}</p></article>)}</GlassCard>
          <GlassCard className="decision-card emphasis">
            <div><span className="eyebrow">ADAPTIVE DECISION</span><div style={{ marginTop: 10 }}><StatusBadge action={result.decision.action} /></div><h2>{result.decision.category ?? 'الخطوة التالية'}</h2><p>{adaptiveReasonAr(result.decision)}</p><Link href={`/practice?learnerId=${encodeURIComponent(learnerId)}`} className="gradient-button" style={{ marginTop: 20 }}>ابدأ التدريب المخصص</Link></div>
            <ProgressRing value={(result.weaknesses.find((w) => w.category === result.decision.category)?.accuracy ?? 0) * 100} label="الدقة" />
          </GlassCard>
        </div>
      )}
    </main>
  );
}
