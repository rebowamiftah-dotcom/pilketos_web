import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

function hashSession(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    const sessionSecret = request.cookies.get(
      'voter_pending_session',
    )?.value;

    if (!sessionSecret) {
      return NextResponse.json(
        { error: 'SESSION_NOT_FOUND' },
        { status: 401 },
      );
    }

    const sessionHash = hashSession(sessionSecret);

    const { data: session, error: sessionError } =
      await supabaseAdmin
        .from('voter_verification_sessions')
        .select('voter_id, expires_at')
        .eq('session_hash', sessionHash)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

    if (sessionError) {
      console.error(
        'Identity session error:',
        sessionError.message,
      );

      return NextResponse.json(
        { error: 'UNKNOWN_ERROR' },
        { status: 500 },
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'SESSION_EXPIRED' },
        { status: 401 },
      );
    }

    const { data: voter, error: voterError } =
      await supabaseAdmin
        .from('voters')
        .select(
          'nama, kelas, jurusan, status_pkl, eligible_for_online_voting, has_voted, is_test_account',
        )
        .eq('id', session.voter_id)
        .maybeSingle();

    if (voterError) {
      console.error(
        'Voter identity lookup error:',
        voterError.message,
      );

      return NextResponse.json(
        { error: 'UNKNOWN_ERROR' },
        { status: 500 },
      );
    }

    if (!voter) {
      return NextResponse.json(
        { error: 'IDENTITY_NOT_FOUND' },
        { status: 404 },
      );
    }

    if (
      voter.is_test_account ||
      voter.has_voted ||
      (!voter.status_pkl &&
        !voter.eligible_for_online_voting)
    ) {
      return NextResponse.json(
        { error: 'NOT_ELIGIBLE' },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      voter: {
        nama: voter.nama,
        kelas: voter.kelas,
        jurusan: voter.jurusan,
      },
    });
  } catch (error) {
    console.error('Identity API error:', error);

    return NextResponse.json(
      { error: 'UNKNOWN_ERROR' },
      { status: 500 },
    );
  }
}