import type {
  AdaptiveDecision,
  CoreCategory,
  DetectedError,
  Difficulty,
  ExerciseType,
  Learner,
  MaintenanceReview,
  Weakness,
} from '../lib/types';

export interface DiagnosticAnalyzeResponse {
  attempt: { id: string };
  analysis: { overall_feedback_ar: string; strengths: string[] };
  errors: DetectedError[];
  weaknesses: Weakness[];
  decision: AdaptiveDecision;
}

export interface ClientExercise {
  id: string;
  practice_session_id: string;
  weakness_category: CoreCategory;
  difficulty: Difficulty;
  exercise_type: ExerciseType;
  instruction_ar: string;
  question: string;
  options: string[] | null;
  explanation_ar: string;
}

export interface PracticeGenerateResponse {
  decision: AdaptiveDecision;
  practiceSession: { id: string; session_type?: string } | null;
  exercises: ClientExercise[];
}

export interface PracticeEvaluateResponse {
  mode?: 'adaptive_practice' | 'maintenance_review';
  result: { correctCount: number; total: number; score: number };
  attempts: unknown[];
  weakness: { before: Weakness | null; after: Weakness };
  maintenanceReview?: MaintenanceReview | null;
  reactivated?: boolean;
  nextDecision: AdaptiveDecision;
}

export interface ProgressResponse {
  learner: Learner;
  weaknesses: Weakness[];
  maintenanceReviews: MaintenanceReview[];
  decision: AdaptiveDecision;
}
