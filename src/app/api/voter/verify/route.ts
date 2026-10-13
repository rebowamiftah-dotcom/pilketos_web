import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type VerificationError =
  | 'TOKEN_NOT_FOUND'
  | 'NAME_MISMATCH'
  | 'KELAS_MISMATCH'
  | 'JURUSAN_MISMATCH'
  | 'NOT_PKL'
  | 'ALREADY_VOTED'
  | 'UNKNOWN_ERROR';

function hashToken(token: string): string {
  return createHash('sha256')
    .update(token.trim().toUpperCase(), 'utf8')
    .digest('hex');
}

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('id-ID');
}

function errorResponse(
  error: VerificationError,
  status = 400,
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return errorResponse('UNKNOWN_ERROR');
    }

    const input = body as Record<string, unknown>;
    const { token, nama, kelas, jurusan } = input;

    if (
      typeof token !== 'string' ||
      typeof nama !== 'string' ||
      typeof kelas !== 'string' ||
      typeof jurusan !== 'string' ||
      !token.trim() ||
      !nama.trim() ||
      !kelas.trim() ||
      !jurusan.trim() ||
      token.length > 200 ||
      nama.length > 200 ||
      kelas.length > 100 ||
      jurusan.length > 200
    ) {
      return errorResponse('UNKNOWN_ERROR');
    }

    const tokenHash = hashToken(token);

    const {
      data: student,
      error,
    } = await supabaseAdmin
      .from('voters')
      .select(
        'id, nama, kelas, jurusan, status_pkl, has_voted',
      )
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) {
      console.error(
        'Kesalahan pencarian pemilih:',
        error.message,
      );

      return errorResponse('UNKNOWN_ERROR', 500);
    }

    if (!student) {
      return errorResponse('TOKEN_NOT_FOUND');
    }

    if (normalize(student.nama) !== normalize(nama)) {
      return errorResponse('NAME_MISMATCH');
    }

    if (normalize(student.kelas) !== normalize(kelas)) {
      return errorResponse('KELAS_MISMATCH');
    }

    if (
      normalize(student.jurusan) !== normalize(jurusan)
    ) {
      return errorResponse('JURUSAN_MISMATCH');
    }

    if (!student.status_pkl) {
      return errorResponse('NOT_PKL');
    }

    if (student.has_voted) {
      return errorResponse('ALREADY_VOTED');
    }

    return NextResponse.json(
      {
        success: true,
        student: {
          id: student.id,
          nama: student.nama,
          kelas: student.kelas,
          jurusan: student.jurusan,
          status_pkl: student.status_pkl,
          has_voted: student.has_voted,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error(
      'Kesalahan endpoint verifikasi pemilih:',
      error instanceof Error
        ? error.message
        : 'Kesalahan tidak diketahui',
    );

    return errorResponse('UNKNOWN_ERROR', 500);
  }
}