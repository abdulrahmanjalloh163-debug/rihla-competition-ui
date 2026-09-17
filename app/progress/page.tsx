'use client';

import {
  Suspense,
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import type { ProgressResponse } from '../types';

import { GlassCard } from '../../components/GlassCard';
import { ProgressRing } from '../../components/ProgressRing';
import { StatusBadge } from '../../components/StatusBadge';

import {
  LEVEL_LABEL,
  GOAL_LABEL,
} from '../../lib/ui/labels';

import {
  storeLearnerId,
} from '../../lib/ui/learnerSession';

export default function ProgressPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProgressContent />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="page loader-page">
      <div className="loader-stack">
        <span className="spinner" />

        <span>
          جاري بناء لوحة التقدّم...
        </span>
      </div>
    </main>
  );
}

function toArabicNumber(
  value: number | string
): string {
  const westernDigits =
    '0123456789';

  const arabicDigits =
    '٠١٢٣٤٥٦٧٨٩';

  return String(value).replace(
    /\d/g,
    (digit) =>
      arabicDigits[
        westernDigits.indexOf(
          digit
        )
      ]
  );
}

function formatPercent(
  value: number
): string {
  return `${toArabicNumber(
    Math.round(value)
  )}٪`;
}

function ProgressContent() {
  const params =
    useSearchParams();

  const learnerId =
    params.get('learnerId') ?? '';

  const [data, setData] =
    useState<ProgressResponse | null>(
      null
    );

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!learnerId) {
      return;
    }

    storeLearnerId(
      learnerId
    );

    let cancelled = false;

    fetch(
      `/api/progress?learnerId=${encodeURIComponent(
        learnerId
      )}`
    )
      .then(async (res) => {
        const body =
          await res.json();

        if (!res.ok) {
          throw new Error(
            body.error ??
              'تعذّر تحميل التقدّم'
          );
        }

        return body as ProgressResponse;
      })
      .then((body) => {
        if (!cancelled) {
          setData(body);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            (err as Error).message
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  if (!learnerId) {
    return (
      <main className="page page-narrow">
        <GlassCard className="empty-state">
          ابدأ رحلتك أولًا لإنشاء لوحة تقدّم.
        </GlassCard>
      </main>
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

  if (!data) {
    return <Loading />;
  }

  const average =
    data.weaknesses.length
      ? Math.round(
          (
            data.weaknesses.reduce(
              (
                sum,
                weakness
              ) =>
                sum +
                weakness.accuracy,
              0
            ) /
            data.weaknesses.length
          ) * 100
        )
      : 0;

  const mastered =
    data.weaknesses.filter(
      (weakness) =>
        weakness.status ===
        'mastered'
    ).length;

  const totalSkills =
    data.weaknesses.length;

  const reviewCount =
    data.maintenanceReviews.length;

  return (
    <main
      className="page"
      dir="rtl"
    >
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">
            ذكاء المتعلّم
          </span>

          <h1>
            مرحبًا،{' '}
            {data.learner.name}
          </h1>

          <p>
            هذه صورة حيّة لما تعلّمته رِحلة عن أدائك حتى الآن.
          </p>
        </div>

        <Link
          className="gradient-button"
          href={`/practice?learnerId=${encodeURIComponent(
            learnerId
          )}`}
        >
          تابع التدريب
        </Link>
      </div>

      <section className="metric-grid">
        <GlassCard className="metric-card">
          <span>
            متوسط الدقة
          </span>

          <strong dir="ltr">
            {formatPercent(
              average
            )}
          </strong>
        </GlassCard>

        <GlassCard className="metric-card">
          <span>
            المهارات المتقنة
          </span>

          <strong>
            {toArabicNumber(
              mastered
            )}{' '}
            من{' '}
            {toArabicNumber(
              totalSkills
            )}
          </strong>
        </GlassCard>

        <GlassCard className="metric-card">
          <span>
            مراجعات التثبيت
          </span>

          <strong>
            {toArabicNumber(
              reviewCount
            )}
          </strong>
        </GlassCard>

        <GlassCard className="metric-card">
          <span>
            المستوى
          </span>

          <strong>
            {
              LEVEL_LABEL[
                data.learner
                  .observed_level
              ]
            }
          </strong>
        </GlassCard>
      </section>

      <div
        className="section-head"
        style={{
          marginTop: 30,
        }}
      >
        <div>
          <span className="eyebrow">
            المهارات المتابَعة
          </span>

          <h2>
            المهارات التي تتابعها رِحلة
          </h2>
        </div>

        <p>
          الهدف:{' '}
          {
            GOAL_LABEL[
              data.learner
                .learning_goal
            ]
          }
        </p>
      </div>

      <section className="category-grid">
        {data.weaknesses.map(
          (weakness) => {
            const accuracyPercent =
              Math.round(
                weakness.accuracy *
                  100
              );

            return (
              <GlassCard
                key={
                  weakness.id
                }
                className="category-card"
              >
                <div className="category-card-top">
                  <div>
                    <h3>
                      {
                        weakness.category
                      }
                    </h3>

                    <p>
                      {toArabicNumber(
                        weakness
                          .relevant_question_count
                      )}{' '}
                      سؤالًا مرتبطًا بهذه المهارة
                    </p>
                  </div>

                  <ProgressRing
                    size={74}
                    value={
                      accuracyPercent
                    }
                  />
                </div>

                <StatusBadge
                  status={
                    weakness.status
                  }
                />

                <div
                  className="progress-track"
                  style={{
                    marginTop: 16,
                  }}
                >
                  <div
                    className="progress-fill"
                    style={{
                      width: `${accuracyPercent}%`,
                    }}
                  />
                </div>
              </GlassCard>
            );
          }
        )}
      </section>

      {mastered === totalSkills &&
        totalSkills > 0 && (
          <GlassCard
            className="mastery-card"
            style={{
              marginTop: 22,
            }}
          >
            <div className="mastery-icon">
              ✓
            </div>

            <span className="eyebrow">
              الإتقان
            </span>

            <h2>
              أتممت إتقان المهارات المتتبَّعة
            </h2>

            <p
              style={{
                color:
                  'var(--muted)',
              }}
            >
              لن تتوقف رِحلة هنا؛ ستستمر مراجعات التثبيت للتأكد من بقاء الإتقان مع مرور الوقت.
            </p>
          </GlassCard>
        )}
    </main>
  );
}