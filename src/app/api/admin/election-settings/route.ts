import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  try {
    // 1. Ambil token dari header Authorization.
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Kamu harus login sebagai admin.' },
        { status: 401 }
      );
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Token login tidak ditemukan.' },
        { status: 401 }
      );
    }

    // 2. Verifikasi token kepada Supabase Auth.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const adminEmail = process.env.ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

    if (!supabaseUrl || !publishableKey || !adminEmail) {
      console.error('Konfigurasi autentikasi admin belum lengkap.');

      return NextResponse.json(
        { error: 'Konfigurasi server belum lengkap.' },
        { status: 500 }
      );
    }

    const authClient = createClient(
      supabaseUrl,
      publishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(accessToken);

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: 'Sesi login tidak valid. Silakan login kembali.' },
        { status: 401 }
      );
    }

    // 3. Pastikan email yang terverifikasi adalah email admin.
    if (user.email.trim().toLowerCase() !== adminEmail) {
      return NextResponse.json(
        { error: 'Kamu tidak memiliki izin mengubah jadwal.' },
        { status: 403 }
      );
    }

    // 4. Baca dan validasi jadwal.
    const body = await request.json();

    const {
      voting_start_at,
      voting_end_at,
      results_publish_at,
    } = body;

    if (
      typeof voting_start_at !== 'string' ||
      typeof voting_end_at !== 'string' ||
      typeof results_publish_at !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Semua tanggal dan waktu wajib diisi.' },
        { status: 400 }
      );
    }

    const start = new Date(voting_start_at);
    const end = new Date(voting_end_at);
    const publish = new Date(results_publish_at);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      Number.isNaN(publish.getTime())
    ) {
      return NextResponse.json(
        { error: 'Tanggal atau waktu tidak valid.' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        {
          error:
            'Waktu mulai harus sebelum waktu penutupan voting.',
        },
        { status: 400 }
      );
    }

    if (publish < end) {
      return NextResponse.json(
        {
          error:
            'Pengumuman hasil harus pada atau setelah voting ditutup.',
        },
        { status: 400 }
      );
    }

    // 5. Pastikan pengaturan pemilihan tersedia.
    const { data: existing, error: readError } =
      await supabaseAdmin
        .from('election_settings')
        .select('id')
        .eq('id', 1)
        .maybeSingle();

    if (readError) {
      console.error('Gagal membaca pengaturan:', readError);

      return NextResponse.json(
        { error: 'Gagal membaca pengaturan dari database.' },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: 'Pengaturan pemilihan dengan ID 1 tidak ditemukan.',
        },
        { status: 404 }
      );
    }

    // 6. Simpan jadwal menggunakan koneksi server.
    const { data: updatedRows, error: updateError } =
      await supabaseAdmin
        .from('election_settings')
        .update({
          voting_start_at: start.toISOString(),
          voting_end_at: end.toISOString(),
          results_publish_at: publish.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)
        .select(
          'id, voting_start_at, voting_end_at, results_publish_at, updated_at'
        );

    if (updateError) {
      console.error('Gagal memperbarui jadwal:', updateError);

      return NextResponse.json(
        { error: 'Gagal menyimpan jadwal ke database.' },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada jadwal yang berhasil diperbarui.' },
        { status: 500 }
      );
    }

    // 7. Kembalikan hasil penyimpanan.
    return NextResponse.json({
      success: true,
      message: 'Jadwal pemilihan berhasil disimpan.',
      schedule: updatedRows[0],
    });
  } catch (error) {
    console.error('Kesalahan API pengaturan jadwal:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memproses jadwal.' },
      { status: 500 }
    );
  }
}