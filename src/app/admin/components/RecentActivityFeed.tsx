'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseAuth } from '@/lib/supabaseAuth';

interface ActivityItem {
  id: string;
  created_at: string;
  message: string;
  type: 'digital' | 'add' | 'subtract';
  vote_count: number;
}

interface ActivityResponse {
  activities: ActivityItem[];
  error?: string;
}

interface RecentActivityFeedProps {
  tickCount: number;
}

export default function RecentActivityFeed({
  tickCount,
}: RecentActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchActivities = useCallback(async () => {
    try {
      const { data, error } = await supabaseAuth.auth.getSession();

      if (error) {
        throw new Error('Gagal memeriksa sesi admin.');
      }

      const token = data.session?.access_token;

      if (!token) {
        throw new Error('Sesi admin tidak ditemukan. Silakan login kembali.');
      }

      const response = await fetch('/api/admin/recent-activities', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const result = (await response.json()) as ActivityResponse;

      if (!response.ok) {
        throw new Error(result.error ?? 'Gagal mengambil aktivitas.');
      }

      setActivities(result.activities ?? []);
      setErrorMessage('');
    } catch (error) {
      console.error('Gagal memuat aktivitas:', error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat memuat aktivitas.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchActivities();
  }, [fetchActivities, tickCount]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchActivities();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [fetchActivities]);

  function formatTime(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    }).format(new Date(value));
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-700 text-foreground text-base">
            Aktivitas Terkini
          </h3>
          <p className="text-muted-foreground text-xs mt-0.5">
            Log suara masuk
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-600 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block pulse-live" />
          Live
        </div>
      </div>

      <div className="space-y-2.5 max-h-80 overflow-y-auto">
        {loading && activities.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">
            Memuat aktivitas...
          </p>
        )}

        {errorMessage && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {!loading && !errorMessage && activities.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">
            Belum ada aktivitas suara.
          </p>
        )}

        {activities.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                item.type === 'digital'
                  ? 'bg-accent/10'
                  : item.type === 'add'
                    ? 'bg-emerald-50'
                    : 'bg-amber-50'
              }`}
            >
              <span
                className={`font-bold ${
                  item.type === 'digital'
                    ? 'text-accent'
                    : item.type === 'add'
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                }`}
              >
                {item.type === 'digital'
                  ? '✓'
                  : item.type === 'add'
                    ? '+'
                    : '−'}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-500 text-foreground leading-tight">
                {item.message}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatTime(item.created_at)} WIB
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}