import { NextRequest, NextResponse } from 'next/server';
import { createLearner, getLearnerByAuthUserId } from '../../../lib/db/learners';
import { requireAuthUser } from '../../../lib/auth/serverAuth';
import type { ArabicLevel, LearningGoal } from '../../../lib/types';

const VALID_LEVELS: ArabicLevel[] = [
  'Beginner',
  'Elementary',
  'Intermediate',
  'Upper Intermediate',
  'Advanced',
];

const VALID_GOALS: LearningGoal[] = [
  'Speaking',
  'Writing',
  'Reading',
  'Understanding Arabic',
  'General Arabic',
];

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser(req.headers.get('authorization'));

    const existingLearner = await getLearnerByAuthUserId(user.id);
    if (existingLearner) {
      return NextResponse.json({ learner: existingLearner }, { status: 200 });
    }

    const body = await req.json();
    const { name, self_reported_level, learning_goal } = body ?? {};

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!VALID_LEVELS.includes(self_reported_level)) {
      return NextResponse.json({ error: 'invalid self_reported_level' }, { status: 400 });
    }
    if (!VALID_GOALS.includes(learning_goal)) {
      return NextResponse.json({ error: 'invalid learning_goal' }, { status: 400 });
    }

    const learner = await createLearner({
      name: name.trim(),
      self_reported_level,
      learning_goal,
      auth_user_id: user.id,
    });

    return NextResponse.json({ learner }, { status: 201 });
  } catch (err) {
    const message = (err as Error).message;

    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا' }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
