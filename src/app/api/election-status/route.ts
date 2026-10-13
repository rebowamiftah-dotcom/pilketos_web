import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('election_settings')
      .select('voting_start_at, voting_end_at, results_publish_at')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Gagal mengambil jadwal pemilihan:', error.message);

      return NextResponse.json(
        { error: 'Gagal mengambil jadwal pemilihan.' },
        { status: 500 }
      );
    }

    const now = Date.now();

    const start = data.voting_start_at
      ? new Date(data.voting_start_at).getTime()
      : null;

    const end = data.voting_end_at
      ? new Date(data.voting_end_at).getTime()
      : null;

    const publish = data.results_publish_at
      ? new Date(data.results_publish_at).getTime()
      : null;

    return NextResponse.json(
      {
        votingOpen: start !== null && end !== null && now >= start && now < end,
        votingClosed: end !== null && now >= end,
        resultsPublished: publish !== null && now >= publish,
        schedule: data,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Kesalahan API election-status:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil jadwal pemilihan.' },
      { status: 500 }
    );
  }
}