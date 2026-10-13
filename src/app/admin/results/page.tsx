'use client';

import { useEffect, useState } from 'react';

type CandidateResult = {
  candidate_id: string;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  foto_url: string | null;
  vote_count: number;
  percentage: number;
};

type ResultsResponse = {
  resultsPublished?: boolean;
  publishAt?: string | null;
  totalVotes?: number;
  results?: CandidateResult[];
  error?: string;
};

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

        if (response.status === 403) {
          setData(result);
          setError('');
          return;
        }

        if (!response.ok) {
          throw new Error(
            result.error || 'Gagal mengambil hasil pemilihan.'
          );
        }

        setData(result);
        setError('');
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan saat memuat hasil.'
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadResults();

    // Periksa kembali status pengumuman setiap 15 detik.
    const interval = setInterval(loadResults, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const formatDate = (value?: string | null) => {
    if (!value) return 'Belum ditentukan';

    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(value)) + ' WIB';
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
          <p className="font-medium text-slate-600">
            Memuat hasil pemilihan...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-red-700">
            Hasil Belum Dapat Dimuat
          </h1>

          <p className="mt-3 text-slate-600">{error}</p>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Coba Lagi
          </button>
        </div>
      </main>
    );
  }

  if (!data?.resultsPublished) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-16">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-4xl">
            🗳️
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-blue-800">
            PILKETOS DIGITAL
          </p>

          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
            Hasil Pemilihan
          </h1>

          <p className="mx-auto mt-4 max-w-lg leading-7 text-slate-600">
            Hasil pemilihan belum diumumkan. Silakan kembali sesuai
            jadwal pengumuman yang telah ditetapkan panitia.
          </p>

          <div className="mt-7 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
              Jadwal pengumuman hasil
            </p>

            <p className="mt-2 font-bold text-slate-900">
              {formatDate(data?.publishAt)}
            </p>
          </div>

          <a
            href="/admin"
            className="mt-7 inline-flex rounded-xl bg-blue-900 px-6 py-3 font-semibold text-white transition hover:bg-blue-800"
          >
            Kembali ke Beranda
          </a>
        </div>
      </main>
    );
  }

  const results = data.results ?? [];

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-800">
            PILKETOS DIGITAL
          </p>

          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Hasil Pemilihan Ketua OSIS
          </h1>

          <p className="mt-4 text-slate-600">
            Rekapitulasi suara berdasarkan data pemilihan.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Hasil Telah Diumumkan
          </div>
        </header>

        <section className="mb-8 rounded-3xl bg-gradient-to-r from-blue-950 to-blue-800 p-7 text-white shadow-lg sm:p-9">
          <p className="text-sm text-blue-200">
            Total suara masuk
          </p>

          <p className="mt-2 text-4xl font-extrabold sm:text-5xl">
            {(data.totalVotes ?? 0).toLocaleString('id-ID')}
          </p>

          <p className="mt-3 text-sm text-blue-200">
            Pengumuman: {formatDate(data.publishAt)}
          </p>
        </section>

        {results.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              Belum Ada Data Pasangan Calon
            </h2>

            <p className="mt-3 text-slate-600">
              Belum ada pasangan calon aktif yang dapat ditampilkan.
            </p>
          </div>
        ) : (
          <section className="space-y-5">
            {results.map((candidate, index) => (
              <article
                key={candidate.candidate_id}
                className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
                  index === 0
                    ? 'border-amber-300 ring-1 ring-amber-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-950 text-2xl font-extrabold text-white">
                      {String(candidate.nomor_urut).padStart(2, '0')}
                    </div>

                    <div className="min-w-0 flex-1">
                      {index === 0 && (
                        <span className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          🏆 PERINGKAT 1
                        </span>
                      )}

                      <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                        {candidate.nama_ketua}
                      </h2>

                      <p className="mt-1 text-slate-600">
                        Wakil Ketua: {candidate.nama_wakil}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-3xl font-extrabold text-blue-950">
                        {candidate.percentage.toLocaleString('id-ID')}%
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {candidate.vote_count.toLocaleString('id-ID')} suara
                      </p>
                    </div>
                  </div>

                  <div
                    className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`Perolehan suara pasangan nomor ${candidate.nomor_urut}`}
                    aria-valuenow={candidate.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-blue-800 transition-all duration-700"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, candidate.percentage)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        <footer className="mt-10 text-center">
          <a
            href="/admin"
            className="inline-flex rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Kembali ke Beranda
          </a>

          <p className="mt-6 text-xs text-slate-500">
            PILKETOS DIGITAL — Hasil ditampilkan berdasarkan data
            yang tersedia di sistem pemilihan.
          </p>
        </footer>
      </div>
    </main>
  );
}