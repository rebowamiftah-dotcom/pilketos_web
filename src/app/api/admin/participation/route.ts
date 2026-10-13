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

export async function GET(request: NextRequest) {
  try {
    // 1. Verifikasi admin
    const user = await verifyAdmin(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login sebagai admin.' },
        { status: 401 }
      );
    }

    // 2. Ambil data pemilih yang memenuhi syarat voting online
    const { data: voters, error } = await supabaseAdmin
      .from('voters')
      .select('id, has_voted, status_pkl, eligible_for_online_voting, is_test_account');

    if (error) {
      console.error('Gagal mengambil data partisipasi:', error);

      return NextResponse.json(
        { error: 'Gagal mengambil data partisipasi pemilih.' },
        { status: 500 }
      );
    }

    // 3. Filter pemilih sesuai aturan pada fungsi cast_vote
    const eligibleVoters = (voters ?? []).filter((voter) => {
      const eligible =
        voter.status_pkl === true ||
        voter.eligible_for_online_voting === true;

      return eligible && voter.is_test_account !== true;
    });

    // 4. Hitung jumlah pemilih dan yang sudah memilih
    const totalVoters = eligibleVoters.length;

    const votedVoters = eligibleVoters.filter(
      (voter) => voter.has_voted === true
    ).length;

    // 5. Hitung persentase partisipasi
    const participation =
      totalVoters > 0
        ? Math.round((votedVoters / totalVoters) * 100)
        : 0;

    return NextResponse.json(
      {
        totalVoters,
        votedVoters,
        participation,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Kesalahan API participation:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
