import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '../../../../lib/auth/serverAuth';
import { getLearnerByAuthUserId } from '../../../../lib/db/learners';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req.headers.get('authorization'));
    const learner = await getLearnerByAuthUserId(user.id);

    return NextResponse.json({ learner }, { status: 200 });
  } catch (err) {
    const message = (err as Error).message;

    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
