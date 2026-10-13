import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function verifyAdmin(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  if (!authorization?.startsWith('Bearer ')) return null;

  const accessToken = authorization.slice(7).trim();
  if (!accessToken) return null;

  const { data, error } =
    await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data.user?.email) return null;

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
    const admin = await verifyAdmin(request);

    if (!admin) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login sebagai admin.' },
        { status: 401 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('voters')
      .select(
        'id, nama, kelas, jurusan, status_pkl, eligible_for_online_voting, has_voted, created_at, is_test_account',
      )
      .order('nama', { ascending: true });

    if (error) {
      console.error('Gagal mengambil data pemilih:', error.message);

      return NextResponse.json(
        { error: 'Gagal mengambil data pemilih dari database.' },
        { status: 500 },
      );
    }

    const voters = (data ?? []).map((voter) => ({
      ...voter,
      token: null,
    }));

    return NextResponse.json(
      {
        success: true,
        total: voters.length,
        voters,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      },
    );
  } catch (error) {
    console.error(
      'Kesalahan API data pemilih:',
      error instanceof Error ? error.message : 'Kesalahan tidak diketahui',
    );

    return NextResponse.json(
      { error: 'Gagal mengambil data pemilih.' },
      { status: 500 },
    );
  }
}