import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Periksa token login admin
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token autentikasi tidak ditemukan.' },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    // 2. Verifikasi pengguna melalui Supabase
    const { data: userData, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !userData.user) {
      return NextResponse.json(
        { error: 'Sesi login tidak valid.' },
        { status: 401 }
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL;

    if (
      !adminEmail ||
      userData.user.email?.toLowerCase() !== adminEmail.toLowerCase()
    ) {
      return NextResponse.json(
        { error: 'Akses hanya untuk admin.' },
        { status: 403 }
      );
    }

    // 3. Ambil data kandidat
    const { data: candidates, error: candidateError } =
      await supabaseAdmin
        .from('candidates')
        .select('id, nomor_urut');

    if (candidateError) {
      throw candidateError;
    }

    const candidateNumbers = new Map(
      (candidates ?? []).map((candidate) => [
        candidate.id,
        candidate.nomor_urut,
      ])
    );

    // 4. Ambil riwayat suara manual
    const { data: manualHistory, error: historyError } =
      await supabaseAdmin
        .from('manual_vote_history')
        .select('id, candidate_id, action, vote_count, notes, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

    if (historyError) {
      throw historyError;
    }

    // 5. Ambil suara digital
    const { data: ballots, error: ballotError } =
      await supabaseAdmin
        .from('ballots')
        .select('*')
        .limit(50);

    if (ballotError) {
      throw ballotError;
    }

    // 6. Susun aktivitas suara manual
    const manualActivities = (manualHistory ?? []).map((item) => {
      const nomor = candidateNumbers.get(item.candidate_id);

      const actionText =
        item.action === 'subtract'
          ? 'mengurangi'
          : 'menambahkan';

      return {
        id: `manual-${item.id}`,
        created_at: item.created_at,
        message: `Admin ${actionText} ${item.vote_count} suara manual — Pasangan ${nomor ?? '?'}`,
        type: item.action,
        vote_count: item.vote_count,
      };
    });

    // 7. Susun aktivitas suara digital
    const digitalActivities = (ballots ?? []).map((item, index) => {
      const candidateId =
        item.candidate_id ?? item.candidate_uuid;

      const nomor = candidateNumbers.get(candidateId);

      return {
        id: `digital-${item.id ?? index}`,
        created_at: item.created_at ?? new Date().toISOString(),
        message: `Suara digital masuk — Pasangan ${nomor ?? '?'}`,
        type: 'digital',
        vote_count: 1,
      };
    });

    // 8. Gabungkan dan urutkan aktivitas
    const activities = [...manualActivities, ...digitalActivities]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 20);

    return NextResponse.json(
      { activities },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Recent activities API error:', error);

    return NextResponse.json(
      { error: 'Gagal mengambil aktivitas terkini dari database.' },
      { status: 500 }
    );
  }
}