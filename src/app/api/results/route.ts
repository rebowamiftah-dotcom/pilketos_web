import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Periksa apakah permintaan berasal dari admin.
    const authorization = request.headers.get('authorization');
    const adminRequested =
      new URL(request.url).searchParams.get('admin') === 'true';

    if (adminRequested) {
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
    }

    // 2. Ambil jadwal pengumuman.
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('election_settings')
      .select('results_publish_at')
      .eq('id', 1)
      .maybeSingle();

    if (settingsError) {
      console.error('Gagal membaca jadwal:', settingsError.message);

      return NextResponse.json(
        { error: 'Gagal membaca jadwal pengumuman.' },
        { status: 500 }
      );
    }

    if (!settings) {
      return NextResponse.json(
        { error: 'Jadwal pemilihan belum tersedia.' },
        { status: 404 }
      );
    }

    const publishTime = settings.results_publish_at
      ? new Date(settings.results_publish_at).getTime()
      : null;

    const resultsPublished =
      publishTime !== null &&
      Number.isFinite(publishTime) &&
      Date.now() >= publishTime;

    // 3. Publik tidak boleh melihat hasil sebelum jadwal pengumuman.
    if (!adminRequested && !resultsPublished) {
      return NextResponse.json(
        {
          error: 'Hasil pemilihan belum diumumkan.',
          resultsPublished: false,
          publishAt: settings.results_publish_at,
        },
        {
          status: 403,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    // 4. Ambil pasangan calon aktif.
    const { data: candidates, error: candidateError } =
      await supabaseAdmin
        .from('candidates')
        .select(
          'id, nomor_urut, nama_ketua, nama_wakil, foto_url'
        )
        .eq('is_active', true)
        .order('nomor_urut', { ascending: true });

    if (candidateError) {
      console.error(
        'Gagal mengambil kandidat:',
        candidateError.message
      );

      return NextResponse.json(
        { error: 'Gagal mengambil data pasangan calon.' },
        { status: 500 }
      );
    }

    // 5. Ambil suara digital.
    const { data: ballots, error: ballotError } =
      await supabaseAdmin
        .from('ballots')
        .select('candidate_id');

    if (ballotError) {
      console.error(
        'Gagal mengambil suara digital:',
        ballotError.message
      );

      return NextResponse.json(
        { error: 'Gagal mengambil suara digital.' },
        { status: 500 }
      );
    }

    const digitalVoteCounts = new Map<string, number>();

    for (const ballot of ballots ?? []) {
      const candidateId = ballot.candidate_id;

      digitalVoteCounts.set(
        candidateId,
        (digitalVoteCounts.get(candidateId) ?? 0) + 1
      );
    }

    // 6. Ambil jumlah suara kertas yang dicatat admin.
    const { data: manualVotes, error: manualVotesError } =
      await supabaseAdmin
        .from('manual_vote_entries')
        .select('candidate_id, vote_count');

    if (manualVotesError) {
      console.error(
        'Gagal mengambil suara kertas:',
        manualVotesError.message
      );

      return NextResponse.json(
        { error: 'Gagal mengambil suara kertas.' },
        { status: 500 }
      );
    }

    const manualVoteCounts = new Map<string, number>();

    for (const entry of manualVotes ?? []) {
      manualVoteCounts.set(
        entry.candidate_id,
        (manualVoteCounts.get(entry.candidate_id) ?? 0) +
          entry.vote_count
      );
    }

    // 7. Gabungkan suara digital dan suara kertas.
    const results = (candidates ?? []).map((candidate) => {
      const digitalVotes =
        digitalVoteCounts.get(candidate.id) ?? 0;

      const paperVotes =
        manualVoteCounts.get(candidate.id) ?? 0;

      return {
        candidate_id: candidate.id,
        nomor_urut: candidate.nomor_urut,
        nama_ketua: candidate.nama_ketua,
        nama_wakil: candidate.nama_wakil,
        foto_url: candidate.foto_url,
        digital_vote_count: digitalVotes,
        manual_vote_count: paperVotes,
        vote_count: digitalVotes + paperVotes,
      };
    });

    // 8. Hitung total suara gabungan.
    const totalDigitalVotes = results.reduce(
      (sum, candidate) => sum + candidate.digital_vote_count,
      0
    );

    const totalManualVotes = results.reduce(
      (sum, candidate) => sum + candidate.manual_vote_count,
      0
    );

    const totalVotes = totalDigitalVotes + totalManualVotes;

    // 9. Hitung persentase dan urutkan perolehan suara.
    const finalResults = results
      .map((candidate) => ({
        ...candidate,
        percentage:
          totalVotes > 0
            ? Number(
                (
                  (candidate.vote_count / totalVotes) *
                  100
                ).toFixed(2)
              )
            : 0,
      }))
      .sort(
        (a, b) =>
          b.vote_count - a.vote_count ||
          a.nomor_urut - b.nomor_urut
      );

    // 10. Kirim hasil.
    return NextResponse.json(
      {
        resultsPublished,
        publishAt: settings.results_publish_at,
        totalDigitalVotes,
        totalManualVotes,
        totalVotes,
        results: finalResults,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Kesalahan API hasil:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil hasil.' },
      { status: 500 }
    );
  }
}