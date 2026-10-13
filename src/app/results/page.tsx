'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CandidateResult {
  candidate_id: string;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  foto_url: string | null;
  vote_count: number;
  percentage: number;
}

interface ResultsResponse {
  resultsPublished: boolean;
  publishAt: string | null;
  totalVotes: number;
  results: CandidateResult[];
  error?: string;
}

export default function ResultsPage() {
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadResults() {
      try {
        const response = await fetch('/api/results', {
          cache: 'no-store',
        });

        const result: ResultsResponse = await response.json();

        if (!active) return;

        if (!response.ok) {
          setData(result);
          setError(
            result.error || 'Hasil pemilihan belum dapat ditampilkan.'
          );
          return;
        }

        setData(result);
        setError('');
      } catch {
        if (active) {
          setError('Gagal mengambil hasil pemilihan. Silakan coba lagi.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadResults();

    const interval = setInterval(loadResults, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    });

  // Urutkan kandidat dari suara terbanyak.
  // Jika suara sama, nomor urut terkecil berada lebih dahulu.
  const sortedResults = [...(data?.results ?? [])].sort(
    (a, b) =>
      b.vote_count - a.vote_count ||
      a.nomor_urut - b.nomor_urut
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-lg font-medium text-slate-600">
          Memuat hasil pemilihan...
        </p>
      </main>
    );
  }

  if (error && !data?.resultsPublished) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-5xl">🗳️</div>

          <h1 className="mb-3 text-2xl font-bold text-slate-800">
            Hasil Pemilihan
          </h1>

          <p className="text-slate-600">{error}</p>

          {data?.publishAt && (
            <p className="mt-4 text-sm text-slate-500">
              Jadwal pengumuman: {formatDate(data.publishAt)}
            </p>
          )}

          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-blue-900 px-6 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Kembali ke Beranda
          </Link>
        </section>
      </main>
    );
  }

  if (!data) return null;

  // Jangan tampilkan perolehan suara sebelum hasil resmi dipublikasikan.
  if (!data.resultsPublished) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-5xl">🗳️</div>

          <h1 className="mb-3 text-2xl font-bold text-slate-800">
            Hasil Pemilihan
          </h1>

          <p className="text-slate-600">
            Hasil pemilihan belum dipublikasikan. Silakan kembali sesuai
            jadwal pengumuman resmi.
          </p>

          {data.publishAt && (
            <p className="mt-4 text-sm text-slate-500">
              Jadwal pengumuman: {formatDate(data.publishAt)}
            </p>
          )}

          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-blue-900 px-6 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Kembali ke Beranda
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center">
          <p className="mb-3 font-semibold uppercase tracking-widest text-blue-800">
            PILKETOS DIGITAL
          </p>

          <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
            Hasil Pemilihan Ketua OSIS
          </h1>

          <p className="mt-3 text-slate-600">
            Hasil perolehan suara pasangan calon ketua dan wakil ketua OSIS.
          </p>
        </header>

        <section className="mb-8 rounded-2xl bg-blue-950 p-6 text-center text-white shadow-lg">
          <p className="text-sm text-blue-200">Total Suara Masuk</p>

          <p className="mt-2 text-5xl font-extrabold">
            {data.totalVotes.toLocaleString('id-ID')}
          </p>
        </section>

        {sortedResults.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow">
            Belum ada data pasangan calon atau suara yang dapat ditampilkan.
          </section>
        ) : (
          <div className="space-y-5">
            {sortedResults.map((candidate, index) => (
              <article
                key={candidate.candidate_id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {candidate.foto_url ? (
                    <img
                      src={candidate.foto_url}
                      alt={`Pasangan calon nomor ${candidate.nomor_urut}`}
                      className="h-24 w-24 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-slate-100 text-3xl">
                      🗳️
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-900">
                        Nomor Urut {candidate.nomor_urut}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          index === 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {index === 0
                          ? '🏆 Peringkat 1'
                          : `Peringkat ${index + 1}`}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900">
                      {candidate.nama_ketua}
                    </h2>

                    <p className="text-slate-600">
                      Wakil: {candidate.nama_wakil}
                    </p>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-700 transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, candidate.percentage)
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">
                        {candidate.vote_count.toLocaleString('id-ID')} suara
                      </span>

                      <span className="font-bold text-blue-900">
                        {candidate.percentage.toLocaleString('id-ID', {
                          maximumFractionDigits: 2,
                        })}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="mt-10 text-center">
          <Link
            href="/"
            className="inline-block rounded-lg bg-blue-900 px-6 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Kembali ke Beranda
          </Link>

          <p className="mt-4 text-xs text-slate-500">
            Data diperbarui secara berkala setiap 15 detik.
          </p>
        </footer>
      </div>
    </main>
  );
}