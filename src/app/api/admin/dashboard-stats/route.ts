import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Verifikasi admin melalui token Supabase Auth.
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Silakan login sebagai admin.' },
        { status: 401 }
      );
    }

    const token = authorization.slice(7).trim();

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const userEmail = authData.user?.email?.trim().toLowerCase();

    if (
      authError ||
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
      console.error('Gagal mengambil data pemilih:', votersError);

      return NextResponse.json(
        { error: 'Gagal mengambil statistik pemilih.' },
        { status: 500 }
      );
    }

    // 3. Hitung statistik pemilih resmi.
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

    // 4. Ambil kandidat aktif.
    const { data: candidates, error: candidatesError } =
      await supabaseAdmin
        .from('candidates')
        .select('id, nomor_urut, nama_ketua, nama_wakil')
        .eq('is_active', true)
        .order('nomor_urut', { ascending: true });

    if (candidatesError) {
      console.error('Gagal mengambil kandidat:', candidatesError);

      return NextResponse.json(
        { error: 'Gagal mengambil data pasangan calon.' },
        { status: 500 }
      );
    }

    // 5. Ambil suara digital.
    const { data: ballots, error: ballotsError } = await supabaseAdmin
      .from('ballots')
      .select('candidate_id');

    if (ballotsError) {
      console.error('Gagal mengambil suara digital:', ballotsError);

      return NextResponse.json(
        { error: 'Gagal mengambil data suara digital.' },
        { status: 500 }
      );
    }

    // 6. Ambil suara manual.
    const { data: manualEntries, error: manualError } =
      await supabaseAdmin
        .from('manual_vote_entries')
        .select('candidate_id, vote_count');

    if (manualError) {
      console.error('Gagal mengambil suara manual:', manualError);

      return NextResponse.json(
        { error: 'Gagal mengambil data suara manual.' },
        { status: 500 }
      );
    }

    // 7. Agregasikan suara digital.
    const digitalCounts = new Map<string, number>();

    for (const ballot of ballots ?? []) {
      digitalCounts.set(
        ballot.candidate_id,
        (digitalCounts.get(ballot.candidate_id) ?? 0) + 1
      );
    }

    // 8. Agregasikan suara manual.
    const manualCounts = new Map<string, number>();

    for (const entry of manualEntries ?? []) {
      manualCounts.set(
        entry.candidate_id,
        (manualCounts.get(entry.candidate_id) ?? 0) +
          entry.vote_count
      );
    }

    // 9. Gabungkan suara untuk setiap kandidat.
    const aggregatesWithoutPercentage = (candidates ?? []).map(
      (candidate) => {
        const digitalVotes = digitalCounts.get(candidate.id) ?? 0;
        const manualVotes = manualCounts.get(candidate.id) ?? 0;

        return {
          candidate_id: candidate.id,
          nomor_urut: candidate.nomor_urut,
          nama_ketua: candidate.nama_ketua,
          nama_wakil: candidate.nama_wakil,
          digital_vote_count: digitalVotes,
          manual_vote_count: manualVotes,
          vote_count: digitalVotes + manualVotes,
        };
      }
    );

    // 10. Hitung total gabungan.
    const totalDigitalVotes = aggregatesWithoutPercentage.reduce(
      (sum, candidate) => sum + candidate.digital_vote_count,
      0
    );

    const totalManualVotes = aggregatesWithoutPercentage.reduce(
      (sum, candidate) => sum + candidate.manual_vote_count,
      0
    );

    const totalSuara = totalDigitalVotes + totalManualVotes;

    // 11. Hitung persentase berdasarkan total gabungan.
    const aggregates = aggregatesWithoutPercentage
      .map((candidate) => ({
        ...candidate,
        percentage:
          totalSuara > 0
            ? Number(
                ((candidate.vote_count / totalSuara) * 100).toFixed(2)
              )
            : 0,
      }))
      .sort(
        (a, b) =>
          b.vote_count - a.vote_count ||
          a.nomor_urut - b.nomor_urut
      );

    // 12. Kirim hasil terbaru.
    return NextResponse.json(
      {
        stats: {
          total_pkl: totalPKL,
          sudah_voting: sudahVoting,
          belum_voting: belumVoting,
          total_suara: totalSuara,
          total_suara_digital: totalDigitalVotes,
          total_suara_manual: totalManualVotes,
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
      {
        error:
          'Terjadi kesalahan saat mengambil statistik dashboard.',
      },
      { status: 500 }
    );
  }
}