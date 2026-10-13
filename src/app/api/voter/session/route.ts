import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function hashSession(value: string): string {
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
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    // Sesi ini hanya tersedia setelah token berhasil diverifikasi.
    const sessionSecret =
      request.cookies.get('voter_verified_session')?.value;

    if (!sessionSecret) {
      return jsonResponse(
        {
          success: false,
          error: 'SESSION_EXPIRED',
          message: 'Sesi pemilih tidak ditemukan. Silakan verifikasi identitas dan token kembali.',
        },
        401,
      );
    }

    const sessionHash = hashSession(sessionSecret);

    const { data: session, error: sessionError } =
      await supabaseAdmin
        .from('voter_verification_sessions')
        .select('id, voter_id, expires_at')
        .eq('session_hash', sessionHash)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

    if (sessionError) {
      console.error('[VOTER SESSION] Lookup failed:', sessionError.message);

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
          message: 'Sesi telah berakhir. Silakan verifikasi kembali.',
        },
        401,
      );

      response.cookies.delete('voter_verified_session');
      return response;
    }

    const { data: voter, error: voterError } =
      await supabaseAdmin
        .from('voters')
        .select(
          'nama, kelas, status_pkl, eligible_for_online_voting, has_voted, is_test_account',
        )
        .eq('id', session.voter_id)
        .maybeSingle();

    if (voterError) {
      console.error('[VOTER SESSION] Voter lookup failed:', voterError.message);

      return jsonResponse(
        { success: false, error: 'UNKNOWN_ERROR' },
        500,
      );
    }

    if (!voter) {
      return jsonResponse(
        {
          success: false,
          error: 'VOTER_NOT_FOUND',
          message: 'Data pemilih tidak ditemukan.',
        },
        404,
      );
    }

    const isEligible =
      voter.status_pkl === true ||
      voter.eligible_for_online_voting === true;

    if (voter.is_test_account || !isEligible) {
      return jsonResponse(
        {
          success: false,
          error: 'NOT_ELIGIBLE',
          message: 'Pemilih tidak memenuhi syarat untuk memberikan suara.',
        },
        403,
      );
    }

    if (voter.has_voted) {
      return jsonResponse(
        {
          success: false,
          error: 'ALREADY_VOTED',
          message: 'Hak pilih sudah digunakan.',
        },
        409,
      );
    }

    return jsonResponse({
      success: true,
      voter: {
        nama: voter.nama,
        kelas: voter.kelas,
        has_voted: voter.has_voted,
      },
    });
  } catch (error) {
    console.error(
      '[VOTER SESSION] Unexpected error:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    return jsonResponse(
      { success: false, error: 'UNKNOWN_ERROR' },
      500,
    );
  }
}