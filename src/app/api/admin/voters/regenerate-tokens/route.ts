import { randomBytes, createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { encryptVoterToken } from '@/lib/voterTokenEncryption';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CREDENTIALS_PATH = path.join(
  process.cwd(),
  '.private',
  'voter-import',
  'voter-issued-credentials.json',
);

function hashValue(value: string): string {
  return createHash('sha256')
    .update(value.trim().toUpperCase(), 'utf8')
    .digest('hex');
}

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    },
  });
}

async function verifyAdmin(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authorization.slice(7).trim();

  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data.user?.email) {
    return null;
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail || data.user.email.toLowerCase() !== adminEmail) {
    return null;
  }

  return data.user;
}

export async function POST(request: NextRequest) {
  let fileHandle: Awaited<ReturnType<typeof open>> | null = null;
  let fileCreated = false;

  try {
    const admin = await verifyAdmin(request);

    if (!admin) {
      return response({ error: 'Akses admin ditolak.' }, 401);
    }

    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      (body as Record<string, unknown>).confirm !==
        'REGENERATE_ALL_TOKENS'
    ) {
      return response({ error: 'Konfirmasi tidak valid.' }, 400);
    }

    const { data: voters, error: fetchError } = await supabaseAdmin
      .from('voters')
      .select('id, nama, kelas, jurusan, has_voted')
      .order('id', { ascending: true });

    if (fetchError || !voters) {
      return response({ error: 'Gagal membaca data pemilih.' }, 500);
    }

    if (voters.length === 0) {
      return response(
        { error: 'Tidak ada data pemilih.', total: 0 },
        409,
      );
    }

    if (voters.some((voter) => voter.has_voted)) {
      return response(
        {
          error:
            'Ada pemilih yang sudah memilih. Regenerasi dibatalkan.',
        },
        409,
      );
    }

    /*
     * Jangan menimpa file kredensial lama secara otomatis.
     * File lama harus diamankan sebelum proses regenerasi.
     */
    await mkdir(path.dirname(CREDENTIALS_PATH), {
      recursive: true,
      mode: 0o700,
    });

    fileHandle = await open(CREDENTIALS_PATH, 'wx', 0o600);
    fileCreated = true;

    const credentials = voters.map((voter) => {
      const token = randomBytes(16).toString('hex').toUpperCase();
      const accessCode = randomBytes(6).toString('hex').toUpperCase();

      return {
        id: voter.id,
        nama: voter.nama,
        kelas: voter.kelas,
        jurusan: voter.jurusan,
        token,
        accessCode,
        token_hash: hashValue(token),
        token_encrypted: encryptVoterToken(token),
        access_code_hash: hashValue(accessCode),
      };
    });

    const privateFile = {
      createdAt: new Date().toISOString(),
      total: credentials.length,
      credentials: credentials.map(
        ({ id, nama, kelas, jurusan, token, accessCode }) => ({
          id,
          nama,
          kelas,
          jurusan,
          token,
          accessCode,
        }),
      ),
    };

    await fileHandle.writeFile(
      JSON.stringify(privateFile, null, 2),
      'utf8',
    );

    await fileHandle.sync();
    await fileHandle.close();
    fileHandle = null;

    /*
     * Perhatian:
     * Fungsi SQL ini wajib mendukung jumlah pemilih dinamis,
     * bukan hanya 35 pemilih.
     */
    const { data, error } = await supabaseAdmin.rpc(
      'regenerate_voter_credentials',
      {
        p_voters: credentials.map(
          ({ id, token_hash, token_encrypted, access_code_hash }) => ({
            id,
            token_hash,
            token_encrypted,
            access_code_hash,
          }),
        ),
      },
    );

    if (
      error ||
      !data?.success ||
      data.updated !== credentials.length
    ) {
      console.error(
        'Regenerasi kredensial gagal:',
        error?.message ?? 'Jumlah data yang diperbarui tidak sesuai.',
      );

      return response(
        {
          error:
            'Database belum terkonfirmasi berhasil. Jangan jalankan regenerasi ulang sebelum memeriksa database dan file privat.',
          total: credentials.length,
        },
        500,
      );
    }

    console.info(
      `Admin ${admin.email} berhasil memperbarui kredensial ${credentials.length} pemilih.`,
    );

    return response({
      success: true,
      message: 'Kredensial berhasil diperbarui.',
      total: credentials.length,
    });
  } catch (error) {
    console.error(
      'Kesalahan regenerasi:',
      error instanceof Error
        ? error.message
        : 'Kesalahan tidak diketahui',
    );

    if (fileHandle) {
      await fileHandle.close().catch(() => {});
    }

    /*
     * File yang sudah dibuat sengaja dipertahankan.
     * Jangan mengulang proses secara otomatis karena hasil
     * operasi database mungkin belum dapat dipastikan.
     */
    return response(
      {
        error:
          'Proses gagal. Periksa database dan file privat sebelum mencoba lagi.',
        fileCreated,
      },
      500,
    );
  }
}