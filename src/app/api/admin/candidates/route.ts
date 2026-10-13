import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice(7);

  const { data, error } = await supabaseAdmin.auth.getUser(token);

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

// GET: mengambil data paslon.
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdmin(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login sebagai admin.' },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('candidates')
      .select(
        'id, nomor_urut, nama_ketua, nama_wakil, visi, misi, foto_url, is_active, created_at'
      )
      .order('nomor_urut', { ascending: true });

    if (error) {
      console.error('Gagal mengambil data paslon:', error);

      return NextResponse.json(
        { error: 'Gagal mengambil data pasangan calon.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ candidates: data ?? [] });
  } catch (error) {
    console.error('Kesalahan API candidates GET:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

// POST: menambahkan paslon.
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login sebagai admin.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const nomorUrut = Number(body.nomor_urut);
    const namaKetua =
      typeof body.nama_ketua === 'string'
        ? body.nama_ketua.trim()
        : '';
    const namaWakil =
      typeof body.nama_wakil === 'string'
        ? body.nama_wakil.trim()
        : '';
    const visi = typeof body.visi === 'string' ? body.visi.trim() : '';
    const misi = typeof body.misi === 'string' ? body.misi.trim() : '';
    const fotoUrl =
      typeof body.foto_url === 'string' ? body.foto_url.trim() : '';

    if (
      !Number.isSafeInteger(nomorUrut) ||
      nomorUrut < 1 ||
      !namaKetua ||
      !namaWakil
    ) {
      return NextResponse.json(
        {
          error:
            'Nomor urut, nama ketua, dan nama wakil wajib diisi dengan benar.',
        },
        { status: 400 }
      );
    }

    if (
      namaKetua.length > 150 ||
      namaWakil.length > 150 ||
      visi.length > 5000 ||
      misi.length > 10000 ||
      fotoUrl.length > 2000
    ) {
      return NextResponse.json(
        { error: 'Ada kolom yang melebihi batas panjang.' },
        { status: 400 }
      );
    }

    if (fotoUrl) {
      try {
        const url = new URL(fotoUrl);

        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          throw new Error('URL foto tidak valid.');
        }
      } catch {
        return NextResponse.json(
          { error: 'URL foto harus berupa alamat HTTP atau HTTPS yang valid.' },
          { status: 400 }
        );
      }
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('candidates')
      .select('id')
      .eq('nomor_urut', nomorUrut)
      .maybeSingle();

    if (existingError) {
      console.error('Gagal memeriksa nomor urut:', existingError);

      return NextResponse.json(
        { error: 'Gagal memeriksa nomor urut paslon.' },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Nomor urut tersebut sudah digunakan.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('candidates')
      .insert({
        nomor_urut: nomorUrut,
        nama_ketua: namaKetua,
        nama_wakil: namaWakil,
        visi: visi || null,
        misi: misi || null,
        foto_url: fotoUrl || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Gagal menambahkan paslon:', error);

      return NextResponse.json(
        { error: 'Gagal menyimpan pasangan calon ke database.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Pasangan calon berhasil ditambahkan.',
        candidate: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Kesalahan API candidates POST:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

// PATCH: mengubah data paslon.
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAdmin(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login sebagai admin.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const id = typeof body.id === 'string' ? body.id : '';
    const nomorUrut = Number(body.nomor_urut);
    const namaKetua =
      typeof body.nama_ketua === 'string'
        ? body.nama_ketua.trim()
        : '';
    const namaWakil =
      typeof body.nama_wakil === 'string'
        ? body.nama_wakil.trim()
        : '';
    const visi = typeof body.visi === 'string' ? body.visi.trim() : '';
    const misi = typeof body.misi === 'string' ? body.misi.trim() : '';
    const fotoUrl =
      typeof body.foto_url === 'string' ? body.foto_url.trim() : '';

    if (
      !id ||
      !Number.isSafeInteger(nomorUrut) ||
      nomorUrut < 1 ||
      !namaKetua ||
      !namaWakil
    ) {
      return NextResponse.json(
        { error: 'Data paslon belum lengkap atau tidak valid.' },
        { status: 400 }
      );
    }

    if (
      namaKetua.length > 150 ||
      namaWakil.length > 150 ||
      visi.length > 5000 ||
      misi.length > 10000 ||
      fotoUrl.length > 2000
    ) {
      return NextResponse.json(
        { error: 'Ada kolom yang melebihi batas panjang.' },
        { status: 400 }
      );
    }

    if (fotoUrl) {
      try {
        const url = new URL(fotoUrl);

        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          throw new Error('URL foto tidak valid.');
        }
      } catch {
        return NextResponse.json(
          { error: 'URL foto harus berupa alamat HTTP atau HTTPS yang valid.' },
          { status: 400 }
        );
      }
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('candidates')
      .select('id')
      .eq('nomor_urut', nomorUrut)
      .neq('id', id)
      .maybeSingle();

    if (existingError) {
      console.error('Gagal memeriksa nomor urut:', existingError);

      return NextResponse.json(
        { error: 'Gagal memeriksa nomor urut paslon.' },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Nomor urut tersebut sudah digunakan paslon lain.' },
        { status: 409 }
      );
    }

    // Jangan mengubah data kandidat selama voting berlangsung.
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('election_settings')
      .select('voting_start_at, voting_end_at')
      .eq('id', 1)
      .maybeSingle();

    if (settingsError) {
      console.error('Gagal membaca jadwal pemilihan:', settingsError);

      return NextResponse.json(
        { error: 'Gagal memeriksa jadwal pemilihan.' },
        { status: 500 }
      );
    }

    const now = Date.now();
    const start = settings?.voting_start_at
      ? new Date(settings.voting_start_at).getTime()
      : null;
    const end = settings?.voting_end_at
      ? new Date(settings.voting_end_at).getTime()
      : null;

    if (
      start !== null &&
      end !== null &&
      now >= start &&
      now < end
    ) {
      return NextResponse.json(
        { error: 'Data paslon tidak dapat diubah selama voting berlangsung.' },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('candidates')
      .update({
        nomor_urut: nomorUrut,
        nama_ketua: namaKetua,
        nama_wakil: namaWakil,
        visi: visi || null,
        misi: misi || null,
        foto_url: fotoUrl || null,
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Gagal mengubah paslon:', error);

      return NextResponse.json(
        { error: 'Gagal mengubah data pasangan calon.' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Pasangan calon tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Data pasangan calon berhasil diperbarui.',
      candidate: data,
    });
  } catch (error) {
    console.error('Kesalahan API candidates PATCH:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

// DELETE: menghapus paslon hanya jika belum memiliki suara.
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdmin(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login sebagai admin.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';

    if (!id) {
      return NextResponse.json(
        { error: 'ID paslon wajib diisi.' },
        { status: 400 }
      );
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('election_settings')
      .select('voting_start_at, voting_end_at')
      .eq('id', 1)
      .maybeSingle();

    if (settingsError) {
      console.error('Gagal membaca jadwal pemilihan:', settingsError);

      return NextResponse.json(
        { error: 'Gagal memeriksa jadwal pemilihan.' },
        { status: 500 }
      );
    }

    const now = Date.now();
    const start = settings?.voting_start_at
      ? new Date(settings.voting_start_at).getTime()
      : null;
    const end = settings?.voting_end_at
      ? new Date(settings.voting_end_at).getTime()
      : null;

    if (
      start !== null &&
      end !== null &&
      now >= start &&
      now < end
    ) {
      return NextResponse.json(
        { error: 'Paslon tidak dapat dihapus selama voting berlangsung.' },
        { status: 403 }
      );
    }

    const { data: ballots, error: ballotsError } = await supabaseAdmin
      .from('ballots')
      .select('id')
      .eq('candidate_id', id)
      .limit(1);

    if (ballotsError) {
      console.error('Gagal memeriksa suara paslon:', ballotsError);

      return NextResponse.json(
        { error: 'Gagal memeriksa riwayat suara paslon.' },
        { status: 500 }
      );
    }

    if (ballots && ballots.length > 0) {
      return NextResponse.json(
        {
          error:
            'Paslon ini sudah memiliki suara digital. Nonaktifkan paslon daripada menghapus riwayat pemilihan.',
        },
        { status: 409 }
      );
    }

    const { data: manualVotes, error: manualError } = await supabaseAdmin
      .from('manual_vote_entries')
      .select('id')
      .eq('candidate_id', id)
      .limit(1);

    if (manualError) {
      console.error('Gagal memeriksa suara kertas:', manualError);

      return NextResponse.json(
        { error: 'Gagal memeriksa rekap suara kertas.' },
        { status: 500 }
      );
    }

    if (manualVotes && manualVotes.length > 0) {
      return NextResponse.json(
        {
          error:
            'Paslon ini memiliki rekap suara kertas. Nonaktifkan paslon daripada menghapus riwayat pemilihan.',
        },
        { status: 409 }
      );
    }

    const { error } = await supabaseAdmin
      .from('candidates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Gagal menghapus paslon:', error);

      return NextResponse.json(
        {
          error:
            'Pasangan calon tidak dapat dihapus. Pastikan tidak ada data lain yang masih merujuk kepadanya.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: 'Pasangan calon berhasil dihapus.',
    });
  } catch (error) {
    console.error('Kesalahan API candidates DELETE:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}