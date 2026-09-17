# Rihla Competition UI Build

This copy contains a full Arabic-first, AI-tech UI layer built on top of the existing adaptive-learning prototype.

## Added / redesigned
- Premium dark navy / cyan / indigo visual system.
- Shared UI components (`AppShell`, `GlassCard`, `Logo`, `StatusBadge`, `ProgressRing`, `ConfidenceMeter`).
- Arabic presentation-label layer and learner-session persistence.
- Landing / onboarding experience with returning-user support.
- AI diagnostic input, live analysis state, structured result cards, confidence display, and Arabic adaptive explanations.
- Practice UI with category/status/difficulty cards, polished exercises, answer-selection state, and result visualization.
- Mastery, maintenance-review, possible-decline, and confirmed-reactivation presentation states.
- Learner intelligence / progress dashboard (`/progress`).
- Read-only progress API (`/api/progress`).
- Idempotent `003_maintenance_reviews.sql` migration for reproducibility.

## Backend preservation
The adaptive engine, AI providers, thresholds, grading logic, and existing API semantics were not redesigned. UI work reads and presents their state.

## Local setup
1. Copy `.env.example` to `.env.local` and fill your own secrets locally.
2. Run `npm install`.
3. Run `npx tsc --noEmit`.
4. Run `npm run lint`.
5. Run `npx vitest run`.
6. Run `npm run build`.
7. Run `npm run dev`.

The provided ZIP intentionally excludes `.env.local`, `.next`, `node_modules`, and `.git`.
