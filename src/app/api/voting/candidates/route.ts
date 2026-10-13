import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('candidates')
      .select(`
        id,
        nomor_urut,
        nama_ketua,
        nama_wakil,
        visi,
        misi,
        foto_url,
        is_active
      `)
      .eq('is_active', true)
      .order('nomor_urut', { ascending: true });

    if (error) {
      console.error('Gagal mengambil kandidat:', error.message);

      return NextResponse.json(
        { success: false, error: 'Gagal mengambil data pasangan calon.' },
        {
          status: 500,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    const candidates = (data ?? []).map((candidate) => {
      const rawMisi = candidate.misi;

      let misi: string[] = [];

      if (Array.isArray(rawMisi)) {
        misi = rawMisi.filter(
          (item): item is string => typeof item === 'string',
        );
      } else if (typeof rawMisi === 'string' && rawMisi.trim()) {
        try {
          const parsed: unknown = JSON.parse(rawMisi);

          if (Array.isArray(parsed)) {
            misi = parsed.filter(
              (item): item is string => typeof item === 'string',
            );
          } else {
            misi = [rawMisi];
          }
        } catch {
          misi = [rawMisi];
        }
      }

      return {
        id: candidate.id,
        nomor_urut: candidate.nomor_urut,
        nama_ketua: candidate.nama_ketua,
        nama_wakil: candidate.nama_wakil,
        visi: candidate.visi ?? '',
        misi,

        // Sesuaikan dengan nama kolom foto yang tersedia di database.
        foto_ketua: candidate.foto_url ?? '',
        foto_wakil: '',

        // Tetap sediakan foto_url untuk kompatibilitas.
        foto_url: candidate.foto_url ?? '',
      };
    });

    return NextResponse.json(
      {
        success: true,
        candidates,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (error) {
    console.error('Kesalahan API kandidat:', error);

    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server.' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}