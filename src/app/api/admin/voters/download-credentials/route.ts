import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return errorResponse('Tidak memiliki akses.', 401);
    }

    const accessToken = authorization.slice(7);
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !data.user?.email) {
      return errorResponse('Sesi admin tidak valid.', 401);
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    if (!adminEmail || data.user.email.toLowerCase() !== adminEmail) {
      return errorResponse('Hanya admin yang dapat mengunduh kredensial.', 403);
    }

    const filePath = path.join(
      process.cwd(),
      '.private',
      'voter-import',
      'voter-issued-credentials.json',
    );

    const raw = await readFile(filePath, 'utf8');
    const file = JSON.parse(raw);

    if (
      !Array.isArray(file.credentials) ||
      file.credentials.length === 0 ||
      file.total !== file.credentials.length
    ) {
      return errorResponse('File kredensial tidak valid.', 500);
    }

    const { data: voters, error: dbError } = await supabaseAdmin
      .from('voters')
      .select('id, token_hash, access_code_hash, token_encrypted');

    if (dbError || !voters || voters.length !== file.credentials.length) {
      return errorResponse(
        'Jumlah pemilih di file dan database berbeda. Kredensial tidak diunduh.',
        409,
      );
    }

    const voterMap = new Map(
      voters.map((voter) => [String(voter.id), voter]),
    );

    const seenIds = new Set<string>();
    const seenHashes = new Set<string>();

    for (const credential of file.credentials) {
      if (
        !credential ||
        !credential.token ||
        !credential.accessCode ||
        credential.id === undefined ||
        credential.id === null
      ) {
        return errorResponse('Data kredensial tidak lengkap.', 409);
      }

      const id = String(credential.id);
      const tokenHash = createHash('sha256')
        .update(String(credential.token).trim().toUpperCase(), 'utf8')
        .digest('hex');

      const voter = voterMap.get(id);

      if (
        seenIds.has(id) ||
        seenHashes.has(tokenHash) ||
        !voter ||
        voter.token_hash !== tokenHash ||
        !voter.access_code_hash ||
        !voter.token_encrypted
      ) {
        return errorResponse(
          'Kredensial file tidak cocok dengan database.',
          409,
        );
      }

      seenIds.add(id);
      seenHashes.add(tokenHash);
    }

    const header = [
      'ID',
      'Nama',
      'Kelas',
      'Jurusan',
      'Token',
      'Kode Akses',
    ];

    const rows = file.credentials.map(
      (credential: {
        id: string | number;
        nama: string;
        kelas: string;
        jurusan: string;
        token: string;
        accessCode: string;
      }) =>
        [
          credential.id,
          credential.nama,
          credential.kelas,
          credential.jurusan,
          credential.token,
          credential.accessCode,
        ]
          .map(csvCell)
          .join(','),
    );

    const csv =
      '\uFEFF' +
      [header.map(csvCell).join(','), ...rows].join('\r\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="kredensial-pemilih.csv"',
        'Cache-Control': 'no-store, private, max-age=0',
        Pragma: 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return errorResponse(
      'Gagal membaca atau memverifikasi file kredensial privat.',
      500,
    );
  }
}
