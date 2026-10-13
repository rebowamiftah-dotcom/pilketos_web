import { randomBytes, createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { encryptVoterToken } from '@/lib/voterTokenEncryption';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('id-ID');
}

function hashValue(value: string): string {
  return createHash('sha256')
    .update(value.trim().toUpperCase(), 'utf8')
    .digest('hex');
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
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

  const { data, error } =
    await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data.user?.email) {
    return null;
  }

  const adminEmail = process.env.ADMIN_EMAIL;

  if (
    !adminEmail ||
    data.user.email.toLowerCase() !== adminEmail.toLowerCase()
  ) {
    return null;
  }

  return data.user;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);

    if (!admin) {
      return jsonResponse(
        { error: 'Akses ditolak. Silakan login sebagai admin.' },
        401,
      );
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse(
        { error: 'Format data tidak valid.' },
        400,
      );
    }

    const input = body as Record<string, unknown>;

    const {
      nama,
      kelas,
      jurusan,
      status_pkl,
      eligible_for_online_voting,
    } = input;

    if (
      typeof nama !== 'string' ||
      typeof kelas !== 'string' ||
      typeof jurusan !== 'string' ||
      typeof status_pkl !== 'boolean' ||
      typeof eligible_for_online_voting !== 'boolean'
    ) {
      return jsonResponse(
        { error: 'Lengkapi nama, kelas, jurusan, dan status pemilih.' },
        400,
      );
    }

    const cleanNama = nama.normalize('NFKC').trim().replace(/\s+/g, ' ');
    const cleanKelas = kelas.normalize('NFKC').trim().replace(/\s+/g, ' ');
    const cleanJurusan = jurusan.normalize('NFKC').trim().replace(/\s+/g, ' ');

    if (
      !cleanNama ||
      !cleanKelas ||
      !cleanJurusan ||
      cleanNama.length > 200 ||
      cleanKelas.length > 100 ||
      cleanJurusan.length > 200
    ) {
      return jsonResponse(
        { error: 'Nama, kelas, atau jurusan tidak valid.' },
        400,
      );
    }

    if (!status_pkl && !eligible_for_online_voting) {
      return jsonResponse(
        {
          error:
            'Pemilih non-PKL harus memiliki persetujuan voting online dari panitia.',
        },
        400,
      );
    }

    // Periksa duplikasi identitas.
    const { data: existingVoters, error: lookupError } =
      await supabaseAdmin
        .from('voters')
        .select('id, nama, kelas, jurusan')
        .limit(10000);

    if (lookupError) {
      console.error(
        'Pemeriksaan duplikasi gagal:',
        lookupError.message,
      );

      return jsonResponse(
        { error: 'Gagal memeriksa data pemilih.' },
        500,
      );
    }

    const duplicate = (existingVoters ?? []).some(
      (voter) =>
        normalize(voter.nama) === normalize(cleanNama) &&
        normalize(voter.kelas) === normalize(cleanKelas) &&
        normalize(voter.jurusan) === normalize(cleanJurusan),
    );

    if (duplicate) {
      return jsonResponse(
        {
          error:
            'Pemilih dengan nama, kelas, dan jurusan tersebut sudah terdaftar.',
        },
        409,
      );
    }

    // Buat token pemilih.
    const token = randomBytes(16).toString('hex').toUpperCase();
    const tokenHash = hashValue(token);
    const encryptedToken = encryptVoterToken(token);

    // Buat kode akses rahasia terpisah dari token pemilih.
    // Kode ini hanya ditampilkan sekali kepada admin.
    const accessCode = randomBytes(6).toString('hex').toUpperCase();
    const accessCodeHash = hashValue(accessCode);

    const { data: createdVoter, error: insertError } =
      await supabaseAdmin
        .from('voters')
        .insert({
          token_hash: tokenHash,
          token_encrypted: encryptedToken,
          access_code_hash: accessCodeHash,
          nama: cleanNama,
          kelas: cleanKelas,
          jurusan: cleanJurusan,
          status_pkl,
          eligible_for_online_voting,
          has_voted: false,
          is_test_account: false,
        })
        .select(
          'id, nama, kelas, jurusan, status_pkl, eligible_for_online_voting, has_voted',
        )
        .single();

    if (insertError || !createdVoter) {
      console.error(
        'Pembuatan pemilih gagal:',
        insertError?.message ?? 'Data hasil insert tidak ditemukan.',
      );

      return jsonResponse(
        { error: 'Gagal menyimpan data pemilih.' },
        500,
      );
    }

    return jsonResponse(
      {
        success: true,
        message: 'Data pemilih berhasil ditambahkan.',
        voter: createdVoter,
        token,
        accessCode,
        warning:
          'Token dan kode akses hanya ditampilkan saat pembuatan. Simpan dan distribusikan secara terpisah dan aman.',
      },
      201,
    );
  } catch (error) {
    console.error(
      'Kesalahan API tambah pemilih:',
      error instanceof Error ? error.message : 'Kesalahan tidak diketahui',
    );

    return jsonResponse(
      { error: 'Terjadi kesalahan pada server.' },
      500,
    );
  }
}