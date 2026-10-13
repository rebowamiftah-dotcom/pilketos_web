import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function hashValue(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const pendingSecret =
      request.cookies.get('voter_pending_session')?.value;

    if (!pendingSecret) {
      return jsonResponse(
        {
          success: false,
          error: 'SESSION_EXPIRED',
          message: 'Sesi verifikasi berakhir. Silakan verifikasi identitas kembali.',
        },
        401,
      );
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse(
        { success: false, error: 'INVALID_TOKEN' },
        400,
      );
    }

    const inputToken = (body as Record<string, unknown>).token;

    if (typeof inputToken !== 'string') {
      return jsonResponse(
        {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Token harus berupa teks.',
        },
        400,
      );
    }

    const normalizedToken = inputToken.trim().toUpperCase();

    // Token harus memiliki minimal 4 karakter.
    if (
      normalizedToken.length < 4 ||
      normalizedToken.length > 200
    ) {
      return jsonResponse(
        {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Token harus terdiri dari minimal 4 karakter.',
        },
        400,
      );
    }

    const sessionHash = hashValue(pendingSecret);

    const { data: session, error: sessionError } =
      await supabaseAdmin
        .from('voter_verification_sessions')
        .select('id, voter_id, expires_at')
        .eq('session_hash', sessionHash)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

    if (sessionError) {
      console.error('[VERIFY TOKEN] Session lookup:', sessionError.message);

      return jsonResponse(
        { success: false, error: 'UNKNOWN_ERROR' },
        500,
      );
    }

    if (!session) {
      const response = jsonResponse(
        {
          success: false,
          error: 'SESSION_EXPIRED',
          message: 'Sesi verifikasi berakhir. Silakan verifikasi identitas kembali.',
        },
        401,
      );

      response.cookies.delete('voter_pending_session');
      return response;
    }

    const tokenHash = hashValue(normalizedToken);

    const { data: voter, error: voterError } =
      await supabaseAdmin
        .from('voters')
        .select(
          'id, token_hash, status_pkl, eligible_for_online_voting, has_voted, is_test_account',
        )
        .eq('id', session.voter_id)
        .maybeSingle();

    if (voterError) {
      console.error('[VERIFY TOKEN] Voter lookup:', voterError.message);

      return jsonResponse(
        { success: false, error: 'UNKNOWN_ERROR' },
        500,
      );
    }

    if (!voter || voter.token_hash !== tokenHash) {
      return jsonResponse(
        {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Token tidak cocok. Periksa kembali token kamu.',
        },
        401,
      );
    }

    const isEligible =
      voter.status_pkl === true ||
      voter.eligible_for_online_voting === true;

    if (voter.is_test_account || !isEligible) {
      return jsonResponse(
        { success: false, error: 'NOT_ELIGIBLE' },
        403,
      );
    }

    if (voter.has_voted) {
      return jsonResponse(
        { success: false, error: 'ALREADY_VOTED' },
        409,
      );
    }

    const verifiedSecret = randomBytes(32).toString('hex');
    const verifiedHash = hashValue(verifiedSecret);

    const { data: updatedSession, error: updateError } =
      await supabaseAdmin
        .from('voter_verification_sessions')
        .update({ session_hash: verifiedHash })
        .eq('id', session.id)
        .eq('session_hash', sessionHash)
        .gt('expires_at', new Date().toISOString())
        .select('id')
        .maybeSingle();

    if (updateError) {
      console.error('[VERIFY TOKEN] Session upgrade:', updateError.message);

      return jsonResponse(
        { success: false, error: 'UNKNOWN_ERROR' },
        500,
      );
    }

    if (!updatedSession) {
      return jsonResponse(
        {
          success: false,
          error: 'SESSION_EXPIRED',
          message: 'Sesi sudah berakhir. Silakan verifikasi identitas kembali.',
        },
        401,
      );
    }

    const response = jsonResponse({
      success: true,
      message: 'Token berhasil diverifikasi.',
    });

    response.cookies.set('voter_verified_session', verifiedSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: new Date(session.expires_at),
    });

    response.cookies.delete('voter_pending_session');

    return response;
  } catch (error) {
    console.error(
      '[VERIFY TOKEN] Unexpected error:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    return jsonResponse(
      { success: false, error: 'UNKNOWN_ERROR' },
      500,
    );
  }
}