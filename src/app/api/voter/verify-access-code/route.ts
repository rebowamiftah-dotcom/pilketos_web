import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Hash untuk session harus konsisten dengan API verifikasi identitas.
function hashSession(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

// Kode akses dinormalisasi menjadi huruf kapital sebelum di-hash.
function hashAccessCode(value: string): string {
  return createHash('sha256')
    .update(value.trim().toUpperCase(), 'utf8')
    .digest('hex');
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Ambil sesi yang dibuat setelah identitas pemilih diverifikasi.
    const sessionSecret =
      request.cookies.get('voter_pending_session')?.value;

    if (!sessionSecret) {
      return jsonResponse(
        {
          success: false,
          error: 'SESSION_EXPIRED',
          message: 'Sesi verifikasi telah berakhir. Silakan verifikasi identitas kembali.',
        },
        401
      );
    }

    // 2. Validasi input.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { success: false, error: 'INVALID_INPUT' },
        400
      );
    }

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return jsonResponse(
        { success: false, error: 'INVALID_INPUT' },
        400
      );
    }

    const accessCode = (body as Record<string, unknown>).accessCode;

    if (
      typeof accessCode !== 'string' ||
      !/^[a-fA-F0-9]{12}$/.test(accessCode.trim())
    ) {
      return jsonResponse(
        { success: false, error: 'INVALID_ACCESS_CODE' },
        400
      );
    }

    // 3. Hash sesi TANPA mengubah huruf besar/kecil.
    const sessionHash = hashSession(sessionSecret);

    const { data: session, error: sessionError } =
      await supabaseAdmin
        .from('voter_verification_sessions')
        .select('id, voter_id, expires_at')
        .eq('session_hash', sessionHash)
        .maybeSingle();

    if (sessionError) {
      console.error(
        'Session lookup failed:',
        sessionError.message
      );

      return jsonResponse(
        { success: false, error: 'UNKNOWN_ERROR' },
        500
      );
    }

    if (
      !session ||
      new Date(session.expires_at).getTime() <= Date.now()
    ) {
      const response = jsonResponse(
        {
          success: false,
          error: 'SESSION_EXPIRED',
          message: 'Sesi verifikasi telah berakhir. Silakan ulangi verifikasi identitas.',
        },
        401
      );

      response.cookies.delete('voter_pending_session');

      return response;
    }

    // 4. Ambil data pemilih.
    const { data: voter, error: voterError } =
      await supabaseAdmin
        .from('voters')
        .select(
          'id, status_pkl, eligible_for_online_voting, has_voted, is_test_account, access_code_hash'
        )
        .eq('id', session.voter_id)
        .maybeSingle();

    if (voterError) {
      console.error(
        'Voter lookup failed:',
        voterError.message
      );

      return jsonResponse(
        { success: false, error: 'UNKNOWN_ERROR' },
        500
      );
    }

    if (!voter) {
      return jsonResponse(
        { success: false, error: 'IDENTITY_NOT_FOUND' },
        404
      );
    }

    // 5. Pastikan pemilih memenuhi syarat.
    if (
      voter.is_test_account ||
      !(voter.status_pkl || voter.eligible_for_online_voting)
    ) {
      return jsonResponse(
        { success: false, error: 'NOT_ELIGIBLE' },
        403
      );
    }

    if (voter.has_voted) {
      return jsonResponse(
        { success: false, error: 'ALREADY_VOTED' },
        409
      );
    }

    // 6. Verifikasi kode akses.
    const accessCodeHash = hashAccessCode(accessCode);

    if (
      !voter.access_code_hash ||
      accessCodeHash !== voter.access_code_hash
    ) {
      return jsonResponse(
        { success: false, error: 'INVALID_ACCESS_CODE' },
        401
      );
    }

    // 7. Buat sesi baru setelah kode akses berhasil diverifikasi.
    const verifiedSecret = randomBytes(32).toString('hex');

    // Hash sesi terverifikasi juga harus menggunakan SHA-256 biasa.
    const verifiedHash = hashSession(verifiedSecret);

    const { data: updatedSession, error: updateError } =
      await supabaseAdmin
        .from('voter_verification_sessions')
        .update({
          session_hash: verifiedHash,
        })
        .eq('id', session.id)
        .eq('session_hash', sessionHash)
        .select('id')
        .maybeSingle();

    if (updateError) {
      console.error(
        'Session update failed:',
        updateError.message
      );

      return jsonResponse(
        { success: false, error: 'UNKNOWN_ERROR' },
        500
      );
    }

    if (!updatedSession) {
      return jsonResponse(
        { success: false, error: 'SESSION_EXPIRED' },
        401
      );
    }

    // 8. Simpan sesi terverifikasi pada cookie HTTP-only.
    const response = jsonResponse({
      success: true,
      message: 'Kode akses berhasil diverifikasi.',
    });

    response.cookies.set(
      'voter_verified_session',
      verifiedSecret,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        expires: new Date(session.expires_at),
      }
    );

    // Hapus sesi pending setelah berhasil diverifikasi.
    response.cookies.delete('voter_pending_session');

    return response;
  } catch (error) {
    console.error(
      'Access-code verification failed:',
      error instanceof Error
        ? error.message
        : 'Unknown error'
    );

    return jsonResponse(
      { success: false, error: 'UNKNOWN_ERROR' },
      500
    );
  }
}
