import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: Request) {
  const authorization = request.headers.get('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return false;
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return false;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const userEmail = data.user?.email?.trim().toLowerCase();

  return !error && !!userEmail && !!adminEmail && userEmail === adminEmail;
}

export async function GET(request: Request) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json(
        { error: 'Kamu tidak memiliki akses admin.' },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('manual_vote_entries')
      .select('id, candidate_id, vote_count, notes, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Gagal mengambil suara kertas:', error.message);

      return NextResponse.json(
        { error: 'Gagal mengambil data suara kertas.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { entries: data ?? [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Kesalahan API suara kertas:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json(
        { error: 'Kamu tidak memiliki akses admin.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const candidateId =
      typeof body.candidateId === 'string' ? body.candidateId : '';

    const voteCount = body.voteCount;

    const notes =
      typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : null;

    if (
      !candidateId ||
      typeof voteCount !== 'number' ||
      !Number.isSafeInteger(voteCount) ||
      voteCount < 0
    ) {
      return NextResponse.json(
        { error: 'Paslon dan jumlah suara harus diisi dengan benar.' },
        { status: 400 }
      );
    }

    // Pastikan paslon benar-benar ada dan aktif.
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .select('id')
      .eq('id', candidateId)
      .eq('is_active', true)
      .maybeSingle();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: 'Pasangan calon tidak ditemukan atau tidak aktif.' },
        { status: 400 }
      );
    }

    // Simpan total suara kertas yang sudah dihitung untuk paslon ini.
    // Untuk saat ini, POST menetapkan nilai total, bukan menambahkannya.
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('manual_vote_entries')
      .select('id')
      .eq('candidate_id', candidateId)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('Gagal memeriksa data suara:', existingError.message);

      return NextResponse.json(
        { error: 'Gagal memeriksa data suara kertas.' },
        { status: 500 }
      );
    }

    const { data: userData } = await supabaseAdmin.auth.getUser(
      request.headers.get('authorization')!.slice(7).trim()
    );

    const entryData = {
      candidate_id: candidateId,
      vote_count: voteCount,
      notes,
      created_by: userData.user?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    const result = existing
      ? await supabaseAdmin
          .from('manual_vote_entries')
          .update(entryData)
          .eq('id', existing.id)
          .select('id, candidate_id, vote_count, notes, created_at, updated_at')
          .single()
      : await supabaseAdmin
          .from('manual_vote_entries')
          .insert(entryData)
          .select('id, candidate_id, vote_count, notes, created_at, updated_at')
          .single();

    if (result.error) {
      console.error('Gagal menyimpan suara kertas:', result.error.message);

      return NextResponse.json(
        { error: 'Gagal menyimpan suara kertas.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Hasil suara kertas berhasil disimpan.', entry: result.data },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Kesalahan API suara kertas:', error);

    return NextResponse.json(
      { error: 'Data tidak valid atau terjadi kesalahan pada server.' },
      { status: 400 }
    );
  }
}