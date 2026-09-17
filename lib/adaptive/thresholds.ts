// Single source of truth for every adaptive-engine threshold.

// Spec §11: "These thresholds are prototype rules and must be easy
// to modify in code. Do not hard-code these values throughout
// the application."

export const ADAPTIVE_THRESHOLDS = {
  // A weakness is CONFIRMED only once both of these are true:
  // >= 3 errors in the category, across >= 2 separate evidence
  // events (a diagnostic submission or a practice session).
  // One diagnostic alone can never confirm a weakness.

  MIN_WEAKNESS_ERRORS: 3,

  MIN_WEAKNESS_ATTEMPTS: 2,

  // Exercise-performance accuracy bands.

  LOW_PERFORMANCE_ACCURACY: 0.5, // < this => explain + easy

  NEEDS_PRACTICE_ACCURACY: 0.7, // < this => needs_practice

  IMPROVING_ACCURACY: 0.7, // >= this and < mastery => improving

  MASTERY_ACCURACY: 0.9,

  MASTERY_MIN_QUESTIONS: 10,

  // Priority bands.

  HIGH_PRIORITY_ACCURACY: 0.5,

  LOW_PRIORITY_ACCURACY: 0.8,

  // Exercises generated per adaptive intervention.

  EXERCISES_PER_SESSION: 5,

  // ------------------------------------------------------------
  // Maintenance review
  // ------------------------------------------------------------

  // Number of questions in each maintenance review.

  MAINTENANCE_REVIEW_QUESTIONS: 5,

  // A mastered category remains mastered when maintenance
  // performance is >= 90%.

  MAINTENANCE_PASS_ACCURACY: 0.9,

  // A maintenance review below 70% is considered a meaningful
  // decline signal.

  MAINTENANCE_REACTIVATION_ACCURACY: 0.7,

  // Require two weak maintenance reviews before reactivating
  // a mastered category. This prevents one bad review from
  // immediately destroying mastery.

  MAINTENANCE_MIN_REVIEWS_FOR_REACTIVATION: 2,
} as const;