import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: 'Token autentikasi tidak ditemukan.' },
        { status: 401 }
      ),
    };
  }

  const token = authorization.slice(7);

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user || !user.email) {
    return {
      error: NextResponse.json(
        { error: 'Sesi tidak valid. Silakan login kembali.' },
        { status: 401 }
      ),
    };
  }

  const adminEmail = process.env.ADMIN_EMAIL;

  if (
    !adminEmail ||
    user.email.toLowerCase() !== adminEmail.toLowerCase()
  ) {
    return {
      error: NextResponse.json(
        { error: 'Kamu tidak memiliki akses admin.' },
        { status: 403 }
      ),
    };
  }

  return { user };
}

// GET: Mengambil kandidat, jumlah suara, dan riwayat perubahan.
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);

  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { data: candidates, error: candidateError } =
      await supabaseAdmin
        .from('candidates')
        .select('id, nomor_urut, nama_ketua, nama_wakil, foto_url')
        .eq('is_active', true)
        .order('nomor_urut', { ascending: true });

    if (candidateError) {
      throw candidateError;
    }

    const { data: entries, error: entriesError } =
      await supabaseAdmin
        .from('manual_vote_entries')
        .select('candidate_id, vote_count');

    if (entriesError) {
      throw entriesError;
    }

    const { data: ballots, error: ballotsError } =
      await supabaseAdmin
        .from('ballots')
        .select('candidate_id');

    if (ballotsError) {
      throw ballotsError;
    }

    const { data: history, error: historyError } =
      await supabaseAdmin
        .from('manual_vote_history')
        .select(
          'id, candidate_id, action, vote_count, notes, created_by, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(100);

    if (historyError) {
      throw historyError;
    }

    const results = (candidates ?? []).map((candidate) => {
      const digitalVotes = (ballots ?? []).filter(
        (ballot) => ballot.candidate_id === candidate.id
      ).length;

      const manualVotes = (entries ?? [])
        .filter((entry) => entry.candidate_id === candidate.id)
        .reduce((total, entry) => total + entry.vote_count, 0);

      return {
        ...candidate,
        digital_vote_count: digitalVotes,
        manual_vote_count: manualVotes,
        vote_count: digitalVotes + manualVotes,
      };
    });

    return NextResponse.json({
      candidates: results,
      history: history ?? [],
    });
  } catch (error) {
    console.error('Gagal mengambil data manual votes:', error);

    return NextResponse.json(
      { error: 'Gagal mengambil data suara dari database.' },
      { status: 500 }
    );
  }
}

// POST: Menambah atau mengurangi suara manual.
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);

  if ('error' in auth) {
    return auth.error;
  }

  try {
    const body = await request.json();

    const candidateId =
      typeof body.candidate_id === 'string'
        ? body.candidate_id
        : '';

    const action = body.action;
    const voteCount = body.vote_count;
    const notes =
      typeof body.notes === 'string'
        ? body.notes.trim()
        : '';

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(candidateId)) {
      return NextResponse.json(
        { error: 'ID kandidat tidak valid.' },
        { status: 400 }
      );
    }

    if (action !== 'add' && action !== 'subtract') {
      return NextResponse.json(
        { error: 'Aksi harus add atau subtract.' },
        { status: 400 }
      );
    }

    if (
      typeof voteCount !== 'number' ||
      !Number.isSafeInteger(voteCount) ||
      voteCount <= 0
    ) {
      return NextResponse.json(
        { error: 'Jumlah suara harus berupa bilangan bulat positif.' },
        { status: 400 }
      );
    }

    if (notes.length > 500) {
      return NextResponse.json(
        { error: 'Catatan maksimal 500 karakter.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.rpc(
      'adjust_manual_votes',
      {
        p_candidate_id: candidateId,
        p_action: action,
        p_vote_count: voteCount,
        p_notes: notes || null,
        p_created_by: auth.user.id,
      }
    );

    if (error) {
      console.error('Gagal mengubah suara manual:', error);

      const message = error.message.includes(
        'Pengurangan melebihi jumlah suara'
      )
        ? 'Jumlah pengurangan melebihi suara manual yang tersedia.'
        : error.message.includes('Kandidat tidak ditemukan')
          ? 'Kandidat tidak ditemukan atau tidak aktif.'
          : 'Gagal menyimpan perubahan suara.';

      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        action === 'add'
          ? 'Suara manual berhasil ditambahkan.'
          : 'Suara manual berhasil dikurangi.',
    });
  } catch (error) {
    console.error('Kesalahan API manual votes:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memproses permintaan.' },
      { status: 500 }
    );
  }
}