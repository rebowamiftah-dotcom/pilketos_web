import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

function hashSession(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const sessionSecret = request.cookies.get(
      'voter_verified_session',
    )?.value;

    if (!sessionSecret) {
      return NextResponse.json(
        { success: false, error: 'SESSION_EXPIRED' },
        { status: 401 },
      );
    }

    const body = await request.json();

    if (
      typeof body.candidateId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.candidateId,
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CANDIDATE' },
        { status: 400 },
      );
    }

    const sessionHash = hashSession(sessionSecret);

    const { data, error } = await supabaseAdmin.rpc('cast_vote', {
      p_session_hash: sessionHash,
      p_candidate_id: body.candidateId,
    });

    if (error) {
      console.error('Voting API error:', error.message);

      return NextResponse.json(
        { success: false, error: 'UNKNOWN_ERROR' },
        { status: 500 },
      );
    }

    if (!data?.success) {
      const errorCode = data?.error ?? 'UNKNOWN_ERROR';

      const status =
        errorCode === 'SESSION_EXPIRED' ? 401 :
        errorCode === 'ALREADY_VOTED' ? 409 :
        errorCode === 'NOT_ELIGIBLE' ? 403 :
        errorCode === 'INVALID_CANDIDATE' ? 400 :
        errorCode === 'VOTING_CLOSED' ? 403 : 400;

      const response = NextResponse.json(
        { success: false, error: errorCode },
        { status },
      );

      if (errorCode === 'SESSION_EXPIRED') {
        response.cookies.delete('voter_verified_session');
      }

      return response;
    }

    const response = NextResponse.json({
      success: true,
      message: 'Suara berhasil dicatat.',
    });

    response.cookies.delete('voter_verified_session');

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'UNKNOWN_ERROR' },
      { status: 400 },
    );
  }
}