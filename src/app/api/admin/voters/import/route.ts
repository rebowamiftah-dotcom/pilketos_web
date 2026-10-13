import { NextRequest, NextResponse } from 'next/server';
import { mkdir, open, readFile } from 'node:fs/promises';
import path from 'node:path';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { realVoters, validateRealVoters } from '@/lib/realVoters';
import { generateVoterToken, hashVoterToken } from '@/lib/generateVoterToken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EXPECTED_OLD_COUNT = 15;
const EXPECTED_TOTAL = 34;
const EXPECTED_OFFICIAL = 33;
const EXPECTED_TEST = 1;

const TOKEN_FILE_DIR = path.join(process.cwd(), '.private', 'voter-import');
const TOKEN_FILE_PATH = path.join(TOKEN_FILE_DIR, 'voter-tokens.json');

type PreparedVoter = {
  token_hash: string;
  nama: string;
  kelas: string;
  jurusan: string;
  status_pkl: boolean;
  is_test_account: boolean;
};

type SavedToken = {
  nama: string;
  kelas: string;
  jurusan: string;
  is_test_account: boolean;
  token: string;
};

function jsonNoStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('id-ID');
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

  const adminEmail = process.env.ADMIN_EMAIL;

  if (
    !adminEmail ||
    data.user.email.toLowerCase() !== adminEmail.toLowerCase()
  ) {
    return null;
  }

  return data.user;
}

function validateRoster(): string | null {
  if (realVoters.length !== EXPECTED_TOTAL) {
    return 'Jumlah data harus tepat 34 akun.';
  }

  const officialCount = realVoters.filter(
    (voter) => !voter.is_test_account
  ).length;

  const testCount = realVoters.filter(
    (voter) => voter.is_test_account
  ).length;

  if (
    officialCount !== EXPECTED_OFFICIAL ||
    testCount !== EXPECTED_TEST
  ) {
    return 'Komposisi harus 33 akun resmi dan 1 akun pengujian.';
  }

  const seenNames = new Set<string>();

  for (const voter of realVoters) {
    if (
      !voter.nama.trim() ||
      !voter.kelas.trim() ||
      !voter.jurusan.trim()
    ) {
      return 'Ada data pemilih yang belum lengkap.';
    }

    const normalizedName = normalize(voter.nama);

    if (seenNames.has(normalizedName)) {
      return 'Terdapat nama pemilih yang duplikat.';
    }

    seenNames.add(normalizedName);

    if (typeof voter.status_pkl !== 'boolean') {
      return `Status PKL tidak valid untuk ${voter.nama}.`;
    }

    if (typeof voter.is_test_account !== 'boolean') {
      return `Status akun tidak valid untuk ${voter.nama}.`;
    }
  }

  const testAccounts = realVoters.filter(
    (voter) => voter.is_test_account
  );

  if (
    testAccounts.length !== 1 ||
    normalize(testAccounts[0].nama) !==
      normalize('Rebowa Miftahurrahman') ||
    normalize(testAccounts[0].kelas) !== normalize('XII RPL')
  ) {
    return 'Identitas akun pengujian tidak sesuai konfigurasi.';
  }

  return null;
}

async function saveTokensSecurely(
  tokens: SavedToken[]
): Promise<void> {
  await mkdir(TOKEN_FILE_DIR, {
    recursive: true,
    mode: 0o700,
  });

  // wx mencegah file token lama tertimpa secara tidak sengaja.
  const file = await open(TOKEN_FILE_PATH, 'wx', 0o600);

  try {
    await file.writeFile(
      JSON.stringify(
        {
          created_at: new Date().toISOString(),
          tokens,
        },
        null,
        2
      ),
      'utf8'
    );

    await file.sync();
  } finally {
    await file.close();
  }
}

/**
 * Membaca token lama jika file sudah ada.
 * Jika file belum ada, membuat dan menyimpan token baru.
 * Token tidak pernah dikirim dalam respons API.
 */
async function getOrCreateSavedTokens(): Promise<SavedToken[]> {
  let fileContent: string;

  try {
    fileContent = await readFile(TOKEN_FILE_PATH, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code !== 'ENOENT') {
      throw new Error('File token tidak dapat dibaca.');
    }

    const generatedTokens = new Set<string>();

    while (generatedTokens.size < EXPECTED_TOTAL) {
      generatedTokens.add(generateVoterToken());
    }

    const tokenList = Array.from(generatedTokens);

    const newSavedTokens: SavedToken[] = realVoters.map(
      (voter, index) => ({
        nama: voter.nama,
        kelas: voter.kelas,
        jurusan: voter.jurusan,
        is_test_account: voter.is_test_account,
        token: tokenList[index],
      })
    );

    await saveTokensSecurely(newSavedTokens);

    return newSavedTokens;
  }

  let parsed: { tokens?: unknown };

  try {
    parsed = JSON.parse(fileContent) as { tokens?: unknown };
  } catch {
    throw new Error(
      'Format file token tidak valid. File tidak diubah.'
    );
  }

  if (
    !Array.isArray(parsed.tokens) ||
    parsed.tokens.length !== EXPECTED_TOTAL
  ) {
    throw new Error(
      'File token harus berisi tepat 34 token. File tidak diubah.'
    );
  }

  const savedTokens = parsed.tokens as SavedToken[];

  const rosterByName = new Map(
    realVoters.map((voter) => [normalize(voter.nama), voter])
  );

  const seenNames = new Set<string>();
  const seenTokens = new Set<string>();

  for (const tokenEntry of savedTokens) {
    if (
      !tokenEntry ||
      typeof tokenEntry.nama !== 'string' ||
      typeof tokenEntry.kelas !== 'string' ||
      typeof tokenEntry.jurusan !== 'string' ||
      typeof tokenEntry.is_test_account !== 'boolean' ||
      typeof tokenEntry.token !== 'string'
    ) {
      throw new Error(
        'Ada data token yang tidak lengkap. File tidak diubah.'
      );
    }

    if (!/^[A-F0-9]{32}$/.test(tokenEntry.token)) {
      throw new Error(
        'Format salah satu token tidak valid. File tidak diubah.'
      );
    }

    const normalizedName = normalize(tokenEntry.nama);
    const rosterEntry = rosterByName.get(normalizedName);

    if (!rosterEntry || seenNames.has(normalizedName)) {
      throw new Error(
        'Nama dalam file token tidak cocok dengan daftar pemilih.'
      );
    }

    if (
      normalize(tokenEntry.kelas) !== normalize(rosterEntry.kelas) ||
      normalize(tokenEntry.jurusan) !== normalize(rosterEntry.jurusan) ||
      tokenEntry.is_test_account !== rosterEntry.is_test_account
    ) {
      throw new Error(
        `Data token tidak cocok dengan daftar pemilih: ${rosterEntry.nama}.`
      );
    }

    if (seenTokens.has(tokenEntry.token)) {
      throw new Error('Ditemukan token duplikat.');
    }

    seenNames.add(normalizedName);
    seenTokens.add(tokenEntry.token);
  }

  if (
    seenNames.size !== EXPECTED_TOTAL ||
    seenTokens.size !== EXPECTED_TOTAL
  ) {
    throw new Error(
      'Validasi seluruh token gagal. File tidak diubah.'
    );
  }

  return savedTokens;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verifikasi admin.
    const user = await verifyAdmin(request);

    if (!user) {
      return jsonNoStore(
        {
          error: 'Akses ditolak. Silakan login sebagai admin.',
        },
        401
      );
    }

    // 2. Batasi impor awal hanya pada development.
    if (process.env.NODE_ENV !== 'development') {
      return jsonNoStore(
        {
          error: 'Impor awal hanya diizinkan dalam mode development.',
        },
        403
      );
    }

    // 3. Validasi roster.
    const rosterError = validateRoster();
    const rosterValidationErrors = validateRealVoters();

    if (rosterError || rosterValidationErrors.length > 0) {
      return jsonNoStore(
        {
          error: 'Validasi daftar pemilih gagal.',
          details: [
            ...(rosterError ? [rosterError] : []),
            ...rosterValidationErrors,
          ],
        },
        400
      );
    }

    // 4. Gunakan kembali token yang tersimpan.
    let savedTokens: SavedToken[];

    try {
      savedTokens = await getOrCreateSavedTokens();
    } catch (error) {
      console.error('Validasi file token gagal:', error);

      return jsonNoStore(
        {
          error:
            error instanceof Error
              ? error.message
              : 'File token tidak dapat digunakan.',
          databaseDiubah: false,
        },
        409
      );
    }

    // 5. Buat payload dengan hash dari token yang tersimpan.
    const preparedVoters: PreparedVoter[] = realVoters.map(
      (voter) => {
        const savedToken = savedTokens.find(
          (entry) =>
            normalize(entry.nama) === normalize(voter.nama)
        );

        if (!savedToken) {
          throw new Error(
            `Token tidak ditemukan untuk ${voter.nama}.`
          );
        }

        return {
          token_hash: hashVoterToken(savedToken.token),
          nama: voter.nama.trim(),
          kelas: voter.kelas.trim(),
          jurusan: voter.jurusan.trim(),
          status_pkl: voter.status_pkl,
          is_test_account: voter.is_test_account,
        };
      }
    );

    // 6. Pastikan hash tidak duplikat.
    const hashes = preparedVoters.map(
      (voter) => voter.token_hash
    );

    if (new Set(hashes).size !== preparedVoters.length) {
      return jsonNoStore(
        {
          error:
            'Duplikasi hash token ditemukan. Tidak ada impor yang dijalankan.',
        },
        400
      );
    }

    // 7. Panggil fungsi SQL yang memvalidasi database dan
    // melakukan penggantian data dalam satu transaksi.
    const { data, error } = await supabaseAdmin.rpc(
      'import_real_voters',
      {
        p_voters: preparedVoters,
        p_expected_old_count: EXPECTED_OLD_COUNT,
      }
    );

    if (error) {
      console.error('Impor pemilih gagal:', error);

      return jsonNoStore(
        {
          error:
            'Impor gagal atau hasilnya belum dapat dipastikan. Periksa database sebelum mencoba lagi.',
          databaseDiubah: 'Belum dapat dipastikan dari respons API.',
          tokenTetapDisimpan: true,
        },
        409
      );
    }

    // 8. Respons tidak berisi token asli.
    return jsonNoStore(
      {
        message: 'Impor pemilih berhasil.',
        hasil: data,
        jumlahAkun: savedTokens.length,
        pemilihResmi: EXPECTED_OFFICIAL,
        akunPengujian: EXPECTED_TEST,
        tokenDisimpanDiServer: true,
        peringatan:
          'File token berisi kredensial pemilih. Simpan dengan aman dan jangan bagikan secara publik.',
      },
      200
    );
  } catch (error) {
    console.error('Kesalahan API impor pemilih:', error);

    return jsonNoStore(
      {
        error: 'Terjadi kesalahan pada server.',
      },
      500
    );
  }
}