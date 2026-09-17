'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useSearchParams } from 'next/navigation';

import type { AdaptiveDecision } from '../../lib/types';

import type {
  ClientExercise,
  PracticeEvaluateResponse,
  PracticeGenerateResponse,
} from '../types';

import { GlassCard } from '../../components/GlassCard';
import { ProgressRing } from '../../components/ProgressRing';
import { StatusBadge } from '../../components/StatusBadge';

import {
  adaptiveReasonAr,
  DIFFICULTY_LABEL,
  statusLabel,
} from '../../lib/ui/labels';

import {
  storeLearnerId,
} from '../../lib/ui/learnerSession';

const ARABIC_LETTERS = [
  'أ',
  'ب',
  'ج',
  'د',
];

function toArabicNumber(
  value: number | string
): string {
  return String(value).replace(
    /\d/g,
    (digit) =>
      '٠١٢٣٤٥٦٧٨٩'[
        Number(digit)
      ]
  );
}

function arabicizeDisplayText(
  value: string
): string {
  return toArabicNumber(value).replace(
    /%/g,
    '٪'
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <LoadingPage text="جاري تحضير التدريب..." />
      }
    >
      <PracticeFlow />
    </Suspense>
  );
}

function LoadingPage({
  text,
}: {
  text: string;
}) {
  return (
    <main className="page loader-page">
      <div className="loader-stack">
        <span className="spinner" />
        <span>{text}</span>
      </div>
    </main>
  );
}

function PracticeFlow() {
  const params = useSearchParams();

  const learnerId =
    params.get('learnerId') ?? '';

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [decision, setDecision] =
    useState<AdaptiveDecision | null>(
      null
    );

  const [session, setSession] =
    useState<
      PracticeGenerateResponse['practiceSession']
    >(null);

  const [exercises, setExercises] =
    useState<ClientExercise[]>([]);

  const [answers, setAnswers] =
    useState<
      Record<string, string>
    >({});

  const [
    evalResult,
    setEvalResult,
  ] =
    useState<
      PracticeEvaluateResponse | null
    >(null);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    generatingNext,
    setGeneratingNext,
  ] =
    useState(false);

  useEffect(() => {
    if (learnerId) {
      storeLearnerId(learnerId);
    }
  }, [learnerId]);

  const answered = useMemo(
    () =>
      exercises.filter(
        (exercise) =>
          (
            answers[
              exercise.id
            ] ?? ''
          )
            .trim()
            .length > 0
      ).length,
    [
      answers,
      exercises,
    ]
  );

  const generatePractice =
    useCallback(
      async () => {
        if (!learnerId) {
          return;
        }

        setError(null);

        try {
          const response =
            await fetch(
              '/api/practice/generate',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body: JSON.stringify(
                  {
                    learnerId,
                  }
                ),
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ??
                'تعذّر إنشاء التدريب'
            );
          }

          setDecision(
            data.decision as AdaptiveDecision
          );

          setSession(
            data.practiceSession
          );

          setExercises(
            data.exercises as ClientExercise[]
          );

          setAnswers({});

          setEvalResult(null);
        } catch (err) {
          setError(
            (err as Error).message
          );
        }
      },
      [learnerId]
    );

  useEffect(() => {
    if (!learnerId) {
      return;
    }

    let cancelled = false;

    async function loadPractice() {
      try {
        await generatePractice();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPractice();

    return () => {
      cancelled = true;
    };
  }, [
    learnerId,
    generatePractice,
  ]);

  async function handleEvaluate() {
    if (!session) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const submissions =
        exercises.map(
          (exercise) => ({
            exerciseId:
              exercise.id,

            answer:
              answers[
                exercise.id
              ] ?? '',
          })
        );

      const response =
        await fetch(
          '/api/practice/evaluate',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              {
                learnerId,

                practiceSessionId:
                  session.id,

                submissions,
              }
            ),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            'فشل تقييم الإجابات'
        );
      }

      setEvalResult(
        data as PracticeEvaluateResponse
      );
    } catch (err) {
      setError(
        (err as Error).message
      );
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
      <main className="page page-narrow">
        <GlassCard className="empty-state">
          لا يوجد ملف متعلّم في هذا
          الرابط. ابدأ رحلة جديدة من
          الصفحة الرئيسية.
        </GlassCard>
      </main>
    );
  }

  if (loading) {
    return (
      <LoadingPage text="جاري تحضير التدريب..." />
    );
  }

  if (error) {
    return (
      <main className="page page-narrow">
        <p className="form-error">
          {error}
        </p>
      </main>
    );
  }

  if (!decision) {
    return (
      <LoadingPage text="جاري قراءة ملفك اللغوي..." />
    );
  }

  if (
    decision.action ===
    'diagnostic_practice'
  ) {
    return (
      <main
        className="page page-narrow"
        dir="rtl"
      >
        <GlassCard className="mastery-card">
          <div className="mastery-icon">
            ◇
          </div>

          <span className="eyebrow">
            التقييم التشخيصي
          </span>

          <h1>
            نحتاج أولًا إلى التعرّف على مستواك
          </h1>

          <p
            style={{
              color:
                'var(--muted)',
              lineHeight: 1.8,
            }}
          >
            لا توجد أدلة كافية عن أدائك بعد. أكمل التقييم التشخيصي حتى تتمكن رِحلة من بناء ملفك اللغوي واختيار التدريب المناسب لك.
          </p>

          <a
            href={`/diagnostic?learnerId=${encodeURIComponent(
              learnerId
            )}`}
            className="gradient-button"
            style={{
              marginTop: 20,
            }}
          >
            ابدأ التقييم التشخيصي
          </a>
        </GlassCard>
      </main>
    );
  }

  if (!decision.category) {
    return (
      <main className="page page-narrow">
        <GlassCard className="mastery-card">
          <div className="mastery-icon">
            ✓
          </div>

          <span className="eyebrow">
            الإتقان
          </span>

          <h1>
            جميع المهارات متقنة
          </h1>

          <p
            style={{
              color:
                'var(--muted)',
              lineHeight: 1.8,
            }}
          >
            {arabicizeDisplayText(
              adaptiveReasonAr(
                decision
              )
            )}
          </p>
        </GlassCard>
      </main>
    );
  }

  const isMaintenance =
    decision.action ===
    'maintenance_review';

  const isPossibleDecline =
    isMaintenance &&
    /possible decline|انخفاض|decline/i.test(
      decision.reason
    );

  return (
    <main
      className="page page-narrow"
      dir="rtl"
    >
      {isMaintenance && (
        <ModeBanner
          kind={
            isPossibleDecline
              ? 'decline'
              : 'maintenance'
          }
        />
      )}

      <GlassCard className="practice-intro emphasis">
        <div className="practice-intro-top">
          <div>
            <span className="eyebrow">
              التدريب التكيّفي
            </span>

            <h1>
              {isMaintenance
                ? 'رِحلة تتحقق من ثبات إتقانك'
                : 'اختارت رِحلة هذا التدريب لك'}
            </h1>
          </div>

          <StatusBadge
            action={
              decision.action
            }
          />
        </div>

        <div className="practice-stats">
          <div className="mini-stat">
            <span>
              الفئة
            </span>

            <strong>
              {
                decision.category
              }
            </strong>
          </div>

          <div className="mini-stat">
            <span>
              الحالة
            </span>

            <strong>
              {statusLabel(
                decision.status
              )}
            </strong>
          </div>

          <div className="mini-stat">
            <span>
              المستوى
            </span>

            <strong>
              {decision.difficulty
                ? DIFFICULTY_LABEL[
                    decision
                      .difficulty
                  ]
                : '—'}
            </strong>
          </div>
        </div>

        <p className="practice-reason">
          {arabicizeDisplayText(
            adaptiveReasonAr(
              decision
            )
          )}
        </p>
      </GlassCard>

      {!evalResult ? (
        <>
          <div className="exercise-list">
            {exercises.map(
              (
                exercise,
                index
              ) => (
                <GlassCard
                  key={
                    exercise.id
                  }
                  className="exercise-card"
                >
                  <div className="exercise-head">
                    <span className="exercise-number">
                      {toArabicNumber(
                        index + 1
                      )}
                    </span>

                    <div>
                      <p className="exercise-instruction">
                        {
                          exercise.instruction_ar
                        }
                      </p>

                      <p className="exercise-question">
                        {
                          exercise.question
                        }
                      </p>
                    </div>
                  </div>

                  {exercise.options ? (
                    <div className="options">
                      {exercise.options.map(
                        (
                          option,
                          optionIndex
                        ) => (
                          <label
                            key={
                              option
                            }
                            className={`option ${
                              answers[
                                exercise
                                  .id
                              ] ===
                              option
                                ? 'selected'
                                : ''
                            }`}
                          >
                            <input
                              type="radio"
                              name={
                                exercise.id
                              }
                              value={
                                option
                              }
                              checked={
                                answers[
                                  exercise
                                    .id
                                ] ===
                                option
                              }
                              onChange={() =>
                                setAnswers(
                                  (
                                    current
                                  ) => ({
                                    ...current,

                                    [exercise.id]:
                                      option,
                                  })
                                )
                              }
                            />

                            <span className="option-letter">
                              {ARABIC_LETTERS[
                                optionIndex
                              ] ??
                                toArabicNumber(
                                  optionIndex + 1
                                )}
                            </span>

                            <span>
                              {
                                option
                              }
                            </span>
                          </label>
                        )
                      )}
                    </div>
                  ) : (
                    <input
                      className="tech-input"
                      style={{
                        marginTop: 16,
                      }}
                      value={
                        answers[
                          exercise
                            .id
                        ] ?? ''
                      }
                      onChange={(
                        event
                      ) =>
                        setAnswers(
                          (
                            current
                          ) => ({
                            ...current,

                            [exercise.id]:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="اكتب إجابتك هنا"
                    />
                  )}
                </GlassCard>
              )
            )}
          </div>

          <div className="submit-row">
            <button
              onClick={
                handleEvaluate
              }
              disabled={
                submitting ||
                answered <
                  exercises.length
              }
              className="gradient-button"
            >
              {submitting
                ? 'جاري التقييم...'
                : `إرسال الإجابات (${toArabicNumber(
                    answered
                  )} من ${toArabicNumber(
                    exercises.length
                  )})`}
            </button>
          </div>
        </>
      ) : (
        <ResultView
          result={
            evalResult
          }
          onNext={
            handleNextPractice
          }
          loading={
            generatingNext
          }
        />
      )}
    </main>
  );
}

function ModeBanner({
  kind,
}: {
  kind:
    | 'maintenance'
    | 'decline'
    | 'reactivated';
}) {
  const content =
    kind === 'maintenance'
      ? {
          cls:
            'mode-maintenance',

          icon:
            '↻',

          title:
            'مراجعة تثبيت',

          text:
            'لقد أتقنت هذه المهارة سابقًا. تتحقق رِحلة الآن من ثبات الإتقان.',
        }
      : kind ===
          'decline'
        ? {
            cls:
              'mode-decline',

            icon:
              '!',

            title:
              'انخفاض محتمل في الأداء',

            text:
              'رصدت رِحلة انخفاضًا محتملاً. ستُجرى مراجعة أخرى قبل اتخاذ قرار بإعادة التدريب.',
          }
        : {
            cls:
              'mode-reactivated',

            icon:
              '↺',

            title:
              'تم رصد تراجع حقيقي',

            text:
              'أعادت رِحلة تفعيل التدريب الموجّه لهذه المهارة.',
          };

  return (
    <div
      className={`mode-banner ${content.cls}`}
    >
      <div className="mode-icon">
        {content.icon}
      </div>

      <div>
        <h3>
          {content.title}
        </h3>

        <p>
          {content.text}
        </p>

        {kind ===
          'reactivated' && (
          <div className="status-transition">
            <span className="from">
              مُتقَن
            </span>

            <b>
              ←
            </b>

            <span className="to">
              يحتاج إلى تدريب
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultView({
  result,
  onNext,
  loading,
}: {
  result:
    PracticeEvaluateResponse;

  onNext:
    () => void;

  loading:
    boolean;
}) {
  const before =
    Math.round(
      (
        result.weakness
          .before
          ?.accuracy ??
        0
      ) * 100
    );

  const after =
    Math.round(
      result.weakness
        .after
        .accuracy *
        100
    );

  const scorePercent =
    Math.round(
      result.result.score *
        100
    );

  return (
    <div className="result-stack">
      {result.reactivated && (
        <ModeBanner kind="reactivated" />
      )}

      <GlassCard className="score-card">
        <span className="eyebrow">
          النتيجة
        </span>

        <div
          className="score-big"
          dir="ltr"
        >
          {
            toArabicNumber(
              result.result
                .correctCount
            )
          }{' '}
          من{' '}
          {
            toArabicNumber(
              result.result
                .total
            )
          }
        </div>

        <div className="score-percent">
          <span dir="ltr">
            {toArabicNumber(
              scorePercent
            )}٪
          </span>
        </div>

        <div className="accuracy-transition">
          <div className="accuracy-pip">
            <strong>
              <span dir="ltr">
                {toArabicNumber(
                  before
                )}٪
              </span>
            </strong>

            <span>
              الدقة السابقة
            </span>
          </div>

          <div className="accuracy-arrow">
            ←
          </div>

          <div className="accuracy-pip">
            <strong
              style={{
                color:
                  after >=
                  before
                    ? 'var(--emerald)'
                    : 'var(--danger)',
              }}
            >
              <span dir="ltr">
                {toArabicNumber(
                  after
                )}٪
              </span>
            </strong>

            <span>
              الدقة الحالية
            </span>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="decision-card emphasis">
        <div>
          <span className="eyebrow">
            القرار التكيّفي التالي
          </span>

          <div
            style={{
              marginTop: 10,
            }}
          >
            <StatusBadge
              action={
                result
                  .nextDecision
                  .action
              }
            />
          </div>

          <h2>
            القرار التكيّفي
            التالي
          </h2>

          <p>
            {arabicizeDisplayText(
              adaptiveReasonAr(
                result.nextDecision
              )
            )}
          </p>

          <button
            onClick={
              onNext
            }
            disabled={
              loading
            }
            className="gradient-button"
            style={{
              marginTop: 20,
            }}
          >
            {loading
              ? 'جاري تحضير التدريب...'
              : 'التدريب التالي'}
          </button>
        </div>

        <ProgressRing
          value={
            after
          }
          label="الدقة"
        />
      </GlassCard>
    </div>
  );
}
