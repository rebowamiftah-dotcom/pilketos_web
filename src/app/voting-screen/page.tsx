import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import VotingPageClient from './components/VotingPageClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function hashSession(value: string): string {
  return createHash('sha256')
    .update(value, 'utf8')
    .digest('hex');
}

export default async function VotingPage() {
  const cookieStore = await cookies();

  const sessionSecret = cookieStore.get(
    'voter_verified_session',
  )?.value;

  if (!sessionSecret) {
    redirect('/voter-verification-screen');
  }

  const sessionHash = hashSession(sessionSecret);

  const { data: session, error: sessionError } =
    await supabaseAdmin
      .from('voter_verification_sessions')
      .select('id, voter_id, expires_at')
      .eq('session_hash', sessionHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

  if (sessionError || !session) {
    redirect('/voter-verification-screen');
  }

  const { data: voter, error: voterError } =
    await supabaseAdmin
      .from('voters')
      .select(
        'id, status_pkl, eligible_for_online_voting, has_voted, is_test_account',
      )
      .eq('id', session.voter_id)
      .maybeSingle();

  if (voterError || !voter) {
    redirect('/voter-verification-screen');
  }

  const isEligible =
    voter.status_pkl === true ||
    voter.eligible_for_online_voting === true;

  if (voter.is_test_account || !isEligible || voter.has_voted) {
    redirect('/voter-verification-screen');
  }

  return <VotingPageClient />;
}