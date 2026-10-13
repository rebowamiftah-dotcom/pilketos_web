import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

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
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { success: false, error: 'INVALID_INPUT' },
        400,
      );
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse(
        { success: false, error: 'INVALID_INPUT' },
        400,
      );
    }

    const input = body as Record<string, unknown>;
    const nama = input.nama;
    const kelas = input.kelas;
    const jurusan = input.jurusan;

    if (
      typeof nama !== 'string' ||
      typeof kelas !== 'string' ||
      typeof jurusan !== 'string' ||
      !nama.trim() ||
      !kelas.trim() ||
      !jurusan.trim() ||
      nama.length > 150 ||
      kelas.length > 50 ||
      jurusan.length > 100
    ) {
      return jsonResponse(
        { success: false, error: 'INVALID_INPUT' },
        400,
      );
    }

    const { data: voters, error } = await supabaseAdmin
      .from('voters')
      .select(
        'id, nama, kelas, jurusan, status_pkl, eligible_for_online_voting, has_voted, is_test_account',
      )
      .ilike('nama', nama.trim());

    if (error) {
      console.error('Identity verification error:', error.message);

      return jsonResponse(
        { success: false, error: 'UNKNOWN_ERROR' },
        500,
      );
    }

    const matches = (voters ?? []).filter(
      (voter) =>
        normalize(voter.nama) === normalize(nama) &&
        normalize(voter.kelas) === normalize(kelas) &&
        normalize(voter.jurusan) === normalize(jurusan),
    );

    if (matches.length !== 1) {
      return jsonResponse(
        { success: false, error: 'IDENTITY_NOT_FOUND' },
        404,
      );
    }

    const voter = matches[0];

    if (voter.is_test_account) {
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

    const isEligible =
      voter.status_pkl === true ||
      voter.eligible_for_online_voting === true;

    if (!isEligible) {
      return jsonResponse(
        { success: false, error: 'NOT_ELIGIBLE' },
        403,
      );
    }

    // Buat sesi sementara setelah identitas cocok.
    const sessionSecret = randomBytes(32).toString('hex');
    const sessionHash = hashSession(sessionSecret);

    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000,
    ).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from('voter_verification_sessions')
      .insert({
        voter_id: voter.id,
        session_hash: sessionHash,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Session creation error:', insertError.message);

      return jsonResponse(
        { success: false, error: 'UNKNOWN_ERROR' },
        500,
      );
    }

    const response = jsonResponse({
      success: true,
      message: 'Identitas berhasil diverifikasi.',
    });

    // Cookie ini dipakai oleh API identitas.
    response.cookies.set('voter_pending_session', sessionSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: new Date(expiresAt),
    });

    // Hapus sesi terverifikasi lama agar tidak dipakai kembali.
    response.cookies.delete('voter_verified_session');

    return response;
  } catch (error) {
    console.error(
      'Identity verification failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    return jsonResponse(
      { success: false, error: 'UNKNOWN_ERROR' },
      500,
    );
  }
}