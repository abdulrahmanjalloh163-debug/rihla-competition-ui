import { getSupabase } from '../db/client';

export async function requireAuthUser(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();

  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const { data, error } = await getSupabase().auth.getUser(token);

  if (error || !data.user) {
    throw new Error('UNAUTHORIZED');
  }

  return data.user;
}
