import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { decryptVoterToken } from '@/lib/voterTokenEncryption';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function hashSession(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function jsonResponse(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    // Gunakan sesi yang dibuat setelah identitas berhasil diverifikasi.
    const sessionSecret = request.cookies.get('voter_pending_session')?.value;

    if (!sessionSecret) {
      return jsonResponse(
        {
          success: false,
          error: 'SESSION_EXPIRED',
          message: 'Sesi identitas tidak ditemukan. Silakan verifikasi identitas kembali.',
        },
        401
      );
    }

    // Cari sesi berdasarkan hash cookie.
    const sessionHash = hashSession(sessionSecret);

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('voter_verification_sessions')
      .select('id, voter_id, expires_at')
      .eq('session_hash', sessionHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (sessionError) {
      console.error('[TOKEN DISPLAY] Session lookup failed:', sessionError.message);

      return jsonResponse({ success: false, error: 'UNKNOWN_ERROR' }, 500);
    }

    if (!session) {
      const response = jsonResponse(
        {
          success: false,
          error: 'SESSION_EXPIRED',
          message: 'Sesi identitas sudah berakhir. Silakan verifikasi identitas kembali.',
        },
        401
      );

      response.cookies.delete('voter_pending_session');
      return response;
    }

    // Ambil data pemilih yang terhubung dengan sesi tersebut.
    const { data: voter, error: voterError } = await supabaseAdmin
      .from('voters')
      .select(
        'nama, kelas, jurusan, token_encrypted, status_pkl, eligible_for_online_voting, has_voted, is_test_account'
      )
      .eq('id', session.voter_id)
      .maybeSingle();

    if (voterError) {
      console.error('[TOKEN DISPLAY] Voter lookup failed:', voterError.message);

      return jsonResponse({ success: false, error: 'UNKNOWN_ERROR' }, 500);
    }

    if (!voter) {
      return jsonResponse({ success: false, error: 'IDENTITY_NOT_FOUND' }, 404);
    }

    const isEligible = voter.status_pkl === true || voter.eligible_for_online_voting === true;

    if (voter.is_test_account || !isEligible) {
      return jsonResponse({ success: false, error: 'NOT_ELIGIBLE' }, 403);
    }

    if (voter.has_voted) {
      return jsonResponse({ success: false, error: 'ALREADY_VOTED' }, 409);
    }

    if (typeof voter.token_encrypted !== 'string' || voter.token_encrypted.trim() === '') {
      return jsonResponse({ success: false, error: 'TOKEN_NOT_AVAILABLE' }, 409);
    }

    let token: string;

    try {
      token = decryptVoterToken(voter.token_encrypted);

      if (!token || !token.trim()) {
        throw new Error('Token hasil dekripsi kosong.');
      }
    } catch (error) {
      console.error(
        '[TOKEN DISPLAY] Decryption failed:',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return jsonResponse({ success: false, error: 'TOKEN_DECRYPTION_FAILED' }, 500);
    }

    return jsonResponse({
      success: true,
      voter: {
        nama: voter.nama,
        kelas: voter.kelas,
        jurusan: voter.jurusan,
        token,
      },
    });
  } catch (error) {
    console.error(
      '[TOKEN DISPLAY] Unexpected error:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return jsonResponse({ success: false, error: 'UNKNOWN_ERROR' }, 500);
  }
}
