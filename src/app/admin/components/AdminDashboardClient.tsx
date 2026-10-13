'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import StatCards from './StatCards';
import VoteResultsChart from './VoteResultsChart';
import RecentActivityFeed from './RecentActivityFeed';
import { supabaseAuth } from '@/lib/supabaseAuth';

interface ParticipationStats {
  total_pkl: number;
  sudah_voting: number;
  belum_voting: number;
  total_suara: number;
  partisipasi: number;
}

interface VoteAggregate {
  candidate_id: string;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  vote_count: number;
  percentage: number;
}

interface DashboardResponse {
  stats: ParticipationStats;
  aggregates: VoteAggregate[];
  error?: string;
}

const emptyStats: ParticipationStats = {
  total_pkl: 0,
  sudah_voting: 0,
  belum_voting: 0,
  total_suara: 0,
  partisipasi: 0,
};

export default function AdminDashboardClient() {
  const [stats, setStats] =
    useState<ParticipationStats>(emptyStats);

  const [aggregates, setAggregates] =
    useState<VoteAggregate[]>([]);

  const [lastUpdated, setLastUpdated] = useState('');
  const [tickCount, setTickCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      // 1. Ambil sesi admin dari Supabase Auth.
      const {
        data: sessionData,
        error: sessionError,
      } = await supabaseAuth.auth.getSession();

      if (sessionError) {
        throw new Error(
          'Gagal memeriksa sesi admin. Silakan login kembali.'
        );
      }

      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error(
          'Sesi admin tidak ditemukan. Silakan login kembali.'
        );
      }

      // 2. Kirim token ke API dashboard.
      const response = await fetch(
        '/api/admin/dashboard-stats',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        }
      );

      // 3. Pastikan respons API berupa JSON.
      const contentType =
        response.headers.get('content-type') ?? '';

      if (!contentType.includes('application/json')) {
        const responseText = await response.text();

        console.error('Respons dashboard bukan JSON:', {
          status: response.status,
          response: responseText.slice(0, 200),
        });

        throw new Error(
          `API dashboard mengembalikan respons bukan JSON (HTTP ${response.status}).`
        );
      }

      const result =
        (await response.json()) as DashboardResponse;

      // 4. Tangani respons gagal dari API.
      if (!response.ok) {
        throw new Error(
          result.error ??
            'Gagal mengambil statistik dashboard.'
        );
      }

      // 5. Perbarui data dashboard.
      setStats(result.stats);
      setAggregates(result.aggregates);
      setErrorMessage('');

      // 6. Perbarui waktu pengambilan data.
      setLastUpdated(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta',
        })
      );

      setTickCount((count) => count + 1);
    } catch (error) {
      console.error(
        'Gagal memuat dashboard:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mengambil statistik.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat data pertama kali dan perbarui setiap 15 detik.
  useEffect(() => {
    void fetchDashboard();

    const interval = window.setInterval(() => {
      void fetchDashboard();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchDashboard]);

  return (
    <AdminLayout
      title="Dashboard Admin"
      subtitle="Monitoring PILKETOS DIGITAL"
    >
      {/* Header dashboard */}
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-700 text-foreground">
            Ringkasan Pemilihan
          </h2>

          <p className="mt-0.5 text-sm text-muted-foreground">
            Periode Oktober 2026 • Data dari database
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-600 text-emerald-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />

            {loading
              ? 'Memuat data'
              : errorMessage
                ? 'Data bermasalah'
                : 'Pemantauan aktif'}
          </div>

          {lastUpdated && (
            <span className="text-xs font-500 text-muted-foreground">
              Diperbarui: {lastUpdated} WIB
            </span>
          )}
        </div>
      </div>

      {/* Pesan error */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {/* Statistik pemilih */}
      <StatCards stats={stats} />

      {/* Grafik dan aktivitas */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <VoteResultsChart
            aggregates={aggregates}
            totalVotes={stats.total_suara}
          />
        </div>

        <div className="xl:col-span-1">
          <RecentActivityFeed tickCount={tickCount} />
        </div>
      </div>
    </AdminLayout>
  );
}