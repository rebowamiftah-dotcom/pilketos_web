import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Verifikasi sesi admin.
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Silakan login sebagai admin.' },
        { status: 401 }
      );
    }

    const token = authorization.slice(7).trim();

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const userEmail = data.user?.email?.trim().toLowerCase();

    if (
      error ||
      !userEmail ||
      !adminEmail ||
      userEmail !== adminEmail
    ) {
      return NextResponse.json(
        { error: 'Kamu tidak memiliki akses admin.' },
        { status: 403 }
      );
    }

    // 2. Ambil data pemilih.
    const { data: voters, error: votersError } = await supabaseAdmin
      .from('voters')
      .select('id, status_pkl, has_voted, is_test_account');

    if (votersError) {
      console.error('Gagal mengambil data pemilih:', votersError.message);

      return NextResponse.json(
        { error: 'Gagal mengambil statistik pemilih.' },
        { status: 500 }
      );
    }

    // 3. Hitung statistik pemilih yang memenuhi syarat.
    // Akun pengujian tidak dimasukkan ke statistik pemilih resmi.
    const eligibleVoters = (voters ?? []).filter(
      (voter) =>
        voter.status_pkl === true &&
        voter.is_test_account !== true
    );

    const totalPKL = eligibleVoters.length;

    const sudahVoting = eligibleVoters.filter(
      (voter) => voter.has_voted === true
    ).length;

    const belumVoting = totalPKL - sudahVoting;

    // 4. Ambil hasil suara melalui endpoint internal yang sama
    // secara logis: hitung agregat dari tabel ballots.
    const { data: candidates, error: candidatesError } =
      await supabaseAdmin
        .from('candidates')
        .select('id, nomor_urut, nama_ketua, nama_wakil')
        .eq('is_active', true)
        .order('nomor_urut', { ascending: true });

    if (candidatesError) {
      console.error('Gagal mengambil kandidat:', candidatesError.message);

      return NextResponse.json(
        { error: 'Gagal mengambil data pasangan calon.' },
        { status: 500 }
      );
    }

    const { data: ballots, error: ballotsError } = await supabaseAdmin
      .from('ballots')
      .select('candidate_id');

    if (ballotsError) {
      console.error('Gagal mengambil suara:', ballotsError.message);

      return NextResponse.json(
        { error: 'Gagal mengambil data suara.' },
        { status: 500 }
      );
    }

    const voteCounts = new Map<string, number>();

    for (const ballot of ballots ?? []) {
      voteCounts.set(
        ballot.candidate_id,
        (voteCounts.get(ballot.candidate_id) ?? 0) + 1
      );
    }

    const aggregatesWithoutPercentage = (candidates ?? []).map(
      (candidate) => ({
        candidate_id: candidate.id,
        nomor_urut: candidate.nomor_urut,
        nama_ketua: candidate.nama_ketua,
        nama_wakil: candidate.nama_wakil,
        vote_count: voteCounts.get(candidate.id) ?? 0,
      })
    );

    const totalSuara = aggregatesWithoutPercentage.reduce(
      (sum, candidate) => sum + candidate.vote_count,
      0
    );

    const aggregates = aggregatesWithoutPercentage.map((candidate) => ({
      ...candidate,
      percentage:
        totalSuara > 0
          ? Number(
              ((candidate.vote_count / totalSuara) * 100).toFixed(2)
            )
          : 0,
    }));

    // 5. Kirim respons JSON.
    return NextResponse.json(
      {
        stats: {
          total_pkl: totalPKL,
          sudah_voting: sudahVoting,
          belum_voting: belumVoting,
          total_suara: totalSuara,
          partisipasi:
            totalPKL > 0
              ? Number(((sudahVoting / totalPKL) * 100).toFixed(2))
              : 0,
        },
        aggregates,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Kesalahan API dashboard:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil statistik dashboard.' },
      { status: 500 }
    );
  }
}