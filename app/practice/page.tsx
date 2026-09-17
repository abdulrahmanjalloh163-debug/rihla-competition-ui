'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AdaptiveDecision } from '../../lib/types';
import type { ClientExercise, PracticeEvaluateResponse, PracticeGenerateResponse } from '../types';
import { GlassCard } from '../../components/GlassCard';
import { ProgressRing } from '../../components/ProgressRing';
import { StatusBadge } from '../../components/StatusBadge';
import { adaptiveReasonAr, DIFFICULTY_LABEL, statusLabel } from '../../lib/ui/labels';
import { storeLearnerId } from '../../lib/ui/learnerSession';

const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د'];

type FlowStage = 'intro' | 'question' | 'result';

function toArabicNumber(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
}

function arabicizeDisplayText(value: string): string {
  return toArabicNumber(value).replace(/%/g, '٪');
}

export default function PracticePage() {
  return (
    <Suspense fallback={<LoadingPage text="جاري تحضير التدريب..." />}>
      <PracticeFlow />
    </Suspense>
  );
}

function LoadingPage({ text }: { text: string }) {
  return (
    <main className="page page-narrow flow-page">
      <div className="loader-stack">
        <span className="spinner" />
        <span>{text}</span>
      </div>
    </main>
  );
}

function PracticeFlow() {
  const params = useSearchParams();
  const learnerId = params.get('learnerId') ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<AdaptiveDecision | null>(null);
  const [session, setSession] = useState<PracticeGenerateResponse['practiceSession']>(null);
  const [exercises, setExercises] = useState<ClientExercise[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evalResult, setEvalResult] = useState<PracticeEvaluateResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [stage, setStage] = useState<FlowStage>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);

  useEffect(() => {
    if (learnerId) storeLearnerId(learnerId);
  }, [learnerId]);

  const answered = useMemo(
    () => exercises.filter((exercise) => (answers[exercise.id] ?? '').trim().length > 0).length,
    [answers, exercises]
  );

  const generatePractice = useCallback(async () => {
    if (!learnerId) return;
    setError(null);

    try {
      const response = await fetch('/api/practice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'تعذّر إنشاء التدريب');

      setDecision(data.decision as AdaptiveDecision);
      setSession(data.practiceSession);
      setExercises(data.exercises as ClientExercise[]);
      setAnswers({});
      setEvalResult(null);
      setQuestionIndex(0);
      setStage('intro');
    } catch (err) {
      setError((err as Error).message);
    }
  }, [learnerId]);

  useEffect(() => {
    if (!learnerId) return;
    let cancelled = false;

    async function loadPractice() {
      try {
        await generatePractice();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPractice();
    return () => {
      cancelled = true;
    };
  }, [learnerId, generatePractice]);

  async function handleEvaluate() {
    if (!session) return;
    setSubmitting(true);
    setError(null);

    try {
      const submissions = exercises.map((exercise) => ({
        exerciseId: exercise.id,
        answer: answers[exercise.id] ?? '',
      }));

      const response = await fetch('/api/practice/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId, practiceSessionId: session.id, submissions }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'فشل تقييم الإجابات');

      setEvalResult(data as PracticeEvaluateResponse);
      setStage('result');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNextPractice() {
    setGeneratingNext(true);
    setError(null);
    try {
      await generatePractice();
    } finally {
      setGeneratingNext(false);
    }
  }

  if (!learnerId) {
    return (
      <main className="page page-narrow flow-page">
        <GlassCard className="flow-card empty-state">لا يوجد ملف متعلّم في هذا الرابط.</GlassCard>
      </main>
    );
  }

  if (loading) return <LoadingPage text="جاري تحضير التدريب..." />;

  if (error) {
    return (
      <main className="page page-narrow flow-page">
        <p className="form-error">{error}</p>
      </main>
    );
  }

  if (!decision) return <LoadingPage text="جاري قراءة ملفك اللغوي..." />;

  if (decision.action === 'diagnostic_practice') {
    return (
      <main className="page page-narrow flow-page" dir="rtl">
        <GlassCard className="flow-card mastery-card">
          <div className="mastery-icon">◇</div>
          <span className="eyebrow">التقييم التشخيصي</span>
          <h1>نحتاج أولًا إلى التعرّف على مستواك</h1>
          <p className="flow-muted">أكمل التقييم التشخيصي حتى تبني رِحلة ملفك اللغوي وتختار التدريب المناسب لك.</p>
          <a href={`/diagnostic?learnerId=${encodeURIComponent(learnerId)}`} className="gradient-button">ابدأ التقييم التشخيصي</a>
        </GlassCard>
      </main>
    );
  }

  if (!decision.category) {
    return (
      <main className="page page-narrow flow-page" dir="rtl">
        <GlassCard className="flow-card mastery-card">
          <div className="mastery-icon">✓</div>
          <span className="eyebrow">الإتقان</span>
          <h1>جميع المهارات متقنة</h1>
          <p className="flow-muted">{arabicizeDisplayText(adaptiveReasonAr(decision))}</p>
        </GlassCard>
      </main>
    );
  }

  const isMaintenance = decision.action === 'maintenance_review';
  const isPossibleDecline = isMaintenance && /possible decline|انخفاض|decline/i.test(decision.reason);

  if (stage === 'intro') {
    return (
      <main className="page page-narrow flow-page" dir="rtl">
        <GlassCard className="flow-card emphasis">
          {isMaintenance && <ModeBanner kind={isPossibleDecline ? 'decline' : 'maintenance'} compact />}
          <div className="practice-intro-top">
            <div>
              <span className="eyebrow">التدريب التكيّفي</span>
              <h1>{isMaintenance ? 'رِحلة تتحقق من ثبات إتقانك' : 'اختارت رِحلة هذا التدريب لك'}</h1>
            </div>
            <StatusBadge action={decision.action} />
          </div>

          <div className="practice-stats flow-stats">
            <div className="mini-stat"><span>الفئة</span><strong>{decision.category}</strong></div>
            <div className="mini-stat"><span>الحالة</span><strong>{statusLabel(decision.status)}</strong></div>
            <div className="mini-stat"><span>المستوى</span><strong>{decision.difficulty ? DIFFICULTY_LABEL[decision.difficulty] : '—'}</strong></div>
          </div>

          <p className="practice-reason">{arabicizeDisplayText(adaptiveReasonAr(decision))}</p>
          <button className="gradient-button flow-primary" onClick={() => setStage('question')}>
            ابدأ التدريب
          </button>
        </GlassCard>
      </main>
    );
  }

  if (stage === 'question') {
    const exercise = exercises[questionIndex];
    if (!exercise) return <LoadingPage text="جاري تحضير السؤال..." />;

    const currentAnswer = answers[exercise.id] ?? '';
    const hasAnswer = currentAnswer.trim().length > 0;
    const isLast = questionIndex === exercises.length - 1;

    return (
      <main className="page page-narrow flow-page" dir="rtl">
        <div className="flow-question-shell">
          <div className="flow-progress-head">
            <span>السؤال {toArabicNumber(questionIndex + 1)} من {toArabicNumber(exercises.length)}</span>
            <span>{decision.category}</span>
          </div>
          <div className="flow-progress-track">
            <div style={{ width: `${((questionIndex + 1) / exercises.length) * 100}%` }} />
          </div>

          <GlassCard className="flow-card question-stage-card emphasis">
            <div className="exercise-head">
              <span className="exercise-number">{toArabicNumber(questionIndex + 1)}</span>
              <div>
                <p className="exercise-instruction">{exercise.instruction_ar}</p>
                <p className="exercise-question">{exercise.question}</p>
              </div>
            </div>

            {exercise.options ? (
              <div className="options flow-options">
                {exercise.options.map((option, optionIndex) => (
                  <label key={option} className={`option ${currentAnswer === option ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name={exercise.id}
                      value={option}
                      checked={currentAnswer === option}
                      onChange={() => setAnswers((current) => ({ ...current, [exercise.id]: option }))}
                    />
                    <span className="option-letter">{ARABIC_LETTERS[optionIndex] ?? toArabicNumber(optionIndex + 1)}</span>
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <input
                className="tech-input flow-answer-input"
                value={currentAnswer}
                onChange={(event) => setAnswers((current) => ({ ...current, [exercise.id]: event.target.value }))}
                placeholder="اكتب إجابتك هنا"
                autoFocus
              />
            )}

            <div className="flow-nav-row">
              <button
                className="gradient-button secondary"
                onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
                disabled={questionIndex === 0}
              >
                السابق
              </button>

              {!isLast ? (
                <button
                  className="gradient-button"
                  onClick={() => setQuestionIndex((index) => Math.min(exercises.length - 1, index + 1))}
                  disabled={!hasAnswer}
                >
                  التالي
                </button>
              ) : (
                <button
                  className="gradient-button"
                  onClick={handleEvaluate}
                  disabled={submitting || answered < exercises.length}
                >
                  {submitting ? 'جاري التقييم...' : `إرسال الإجابات (${toArabicNumber(answered)} من ${toArabicNumber(exercises.length)})`}
                </button>
              )}
            </div>
          </GlassCard>
        </div>
      </main>
    );
  }

  if (!evalResult) return <LoadingPage text="جاري عرض النتيجة..." />;

  return (
    <main className="page page-narrow flow-page" dir="rtl">
      <ResultView result={evalResult} onNext={handleNextPractice} loading={generatingNext} />
    </main>
  );
}

function ModeBanner({ kind, compact = false }: { kind: 'maintenance' | 'decline' | 'reactivated'; compact?: boolean }) {
  const content =
    kind === 'maintenance'
      ? { cls: 'mode-maintenance', icon: '↻', title: 'مراجعة تثبيت', text: 'تتحقق رِحلة الآن من ثبات إتقانك.' }
      : kind === 'decline'
        ? { cls: 'mode-decline', icon: '!', title: 'انخفاض محتمل', text: 'ستُجرى مراجعة إضافية قبل إعادة التدريب.' }
        : { cls: 'mode-reactivated', icon: '↺', title: 'تم رصد تراجع حقيقي', text: 'أعادت رِحلة تفعيل التدريب الموجّه.' };

  return (
    <div className={`mode-banner ${content.cls} ${compact ? 'flow-mode-compact' : ''}`}>
      <div className="mode-icon">{content.icon}</div>
      <div><h3>{content.title}</h3><p>{content.text}</p></div>
    </div>
  );
}

function ResultView({ result, onNext, loading }: { result: PracticeEvaluateResponse; onNext: () => void; loading: boolean }) {
  const before = Math.round((result.weakness.before?.accuracy ?? 0) * 100);
  const after = Math.round(result.weakness.after.accuracy * 100);
  const scorePercent = Math.round(result.result.score * 100);

  return (
    <GlassCard className="flow-card result-one-screen emphasis">
      {result.reactivated && <ModeBanner kind="reactivated" compact />}

      <div className="result-one-grid">
        <div className="result-score-panel">
          <span className="eyebrow">النتيجة</span>
          <div className="score-big" dir="ltr">
            {toArabicNumber(result.result.correctCount)} من {toArabicNumber(result.result.total)}
          </div>
          <div className="score-percent"><span dir="ltr">{toArabicNumber(scorePercent)}٪</span></div>
          <div className="accuracy-transition flow-accuracy">
            <div className="accuracy-pip"><strong dir="ltr">{toArabicNumber(before)}٪</strong><span>الدقة السابقة</span></div>
            <div className="accuracy-arrow">←</div>
            <div className="accuracy-pip"><strong dir="ltr">{toArabicNumber(after)}٪</strong><span>الدقة الحالية</span></div>
          </div>
        </div>

        <div className="result-decision-panel">
          <span className="eyebrow">القرار التكيّفي التالي</span>
          <div className="flow-badge-wrap"><StatusBadge action={result.nextDecision.action} /></div>
          <h2>ما الذي ستفعله رِحلة بعد ذلك؟</h2>
          <p className="flow-muted">{arabicizeDisplayText(adaptiveReasonAr(result.nextDecision))}</p>
          <button onClick={onNext} disabled={loading} className="gradient-button">
            {loading ? 'جاري تحضير التدريب...' : 'التدريب التالي'}
          </button>
        </div>

        <ProgressRing value={after} label="الدقة" />
      </div>
    </GlassCard>
  );
}
