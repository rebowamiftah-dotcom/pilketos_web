'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface CandidateResult {
  candidate_id: string;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  foto_url: string | null;
  digital_vote_count: number;
  vote_count: number;
  percentage: number;
}

interface ResultsResponse {
  success?: boolean;
  totalVotes: number;
  results: CandidateResult[];
  resultsPublished?: boolean;
  publishAt?: string | null;
  message?: string;
}

function formatNumber(value: number | undefined | null): string {
  return (value ?? 0).toLocaleString('id-ID');
}

function formatPercentage(value: number | undefined | null): string {
  return `${(value ?? 0).toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function getCandidateName(candidate: CandidateResult): string {
  return candidate.nama_ketua?.trim() || 'Nama belum tersedia';
}

function getViceName(candidate: CandidateResult): string {
  return candidate.nama_wakil?.trim() || 'Nama belum tersedia';
}

const rankStyles = [
  {
    border: 'border-amber-400',
    badge: 'bg-amber-400 text-slate-950',
    text: 'text-amber-700',
    bar: 'bg-amber-500',
    label: 'PERINGKAT 1',
  },
  {
    border: 'border-slate-300',
    badge: 'bg-slate-300 text-slate-900',
    text: 'text-slate-700',
    bar: 'bg-slate-500',
    label: 'PERINGKAT 2',
  },
  {
    border: 'border-orange-400',
    badge: 'bg-orange-400 text-orange-950',
    text: 'text-orange-800',
    bar: 'bg-orange-500',
    label: 'PERINGKAT 3',
  },
];

export default function ResultsPage() {
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [resultsPublished, setResultsPublished] = useState(false);
  const [publishAt, setPublishAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch('/api/results', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Gagal mengambil data hasil pemilihan.');
      }

      const data: ResultsResponse = await response.json();
      const candidates = Array.isArray(data.results) ? data.results : [];

      const sortedCandidates = [...candidates].sort((a, b) => {
        const difference = (b.vote_count ?? 0) - (a.vote_count ?? 0);

        return difference !== 0
          ? difference
          : a.nomor_urut - b.nomor_urut;
      });

      setResults(sortedCandidates);
      setTotalVotes(data.totalVotes ?? 0);
      setResultsPublished(data.resultsPublished ?? false);
      setPublishAt(data.publishAt ?? null);

      setLastUpdated(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      );

      setError('');
    } catch (err) {
      console.error('Gagal memuat hasil PILKETOS:', err);
      setError('Gagal memuat hasil pemilihan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchResults();

    const interval = window.setInterval(() => {
      void fetchResults();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [fetchResults]);

  const topCandidates = results.slice(0, 3);

  const isPublished =
    resultsPublished &&
    (!publishAt || new Date(publishAt).getTime() <= Date.now());

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-800" />
          <h1 className="text-xl font-black sm:text-2xl">
            Memuat Hasil PILKETOS
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Mohon tunggu sebentar...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-lg">
          <h1 className="text-xl font-black text-red-700">
            Terjadi Kesalahan
          </h1>
          <p className="mt-3 text-sm text-slate-700">{error}</p>
          <button
            type="button"
            onClick={() => void fetchResults()}
            className="mt-5 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-900"
          >
            Coba Lagi
          </button>
        </div>
      </main>
    );
  }

  if (!isPublished) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
        <div className="w-full max-w-2xl rounded-2xl border border-blue-200 bg-white p-6 text-center shadow-xl sm:p-10">
          <div className="mb-4 text-5xl">🗳️</div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-800">
            PILKETOS
          </p>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">
            HASIL PENGHITUNGAN SUARA
          </h1>
          <p className="mt-4 text-base font-semibold text-slate-700">
            Hasil penghitungan suara belum dipublikasikan.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Hasil akan ditampilkan setelah publikasi diaktifkan.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg border border-blue-800 px-5 py-2.5 text-sm font-bold text-blue-900 hover:bg-blue-50"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-900">
      {/* HEADER */}
      <header className="border-b-4 border-blue-300 bg-blue-800 px-4 py-4 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1800px] flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100 sm:text-sm">
              PEMILIHAN KETUA OSIS
            </p>
            <h1 className="mt-1 text-xl font-black leading-tight sm:text-2xl lg:text-3xl">
              HASIL PENGHITUNGAN SUARA
            </h1>
            <p className="mt-2 text-xs font-bold text-white sm:text-sm">
              PILKETOS SMK TERATAI PUTIH GLOBAL 4 BEKASI
            </p>
          </div>

          <div className="rounded-xl border border-white/40 bg-white px-4 py-2.5 text-center text-blue-900 shadow-sm">
            <div className="flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-600" />
              <span className="text-xs font-black uppercase tracking-wide">
                Hasil Terpublikasi
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Pembaruan setiap 5 detik
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] space-y-5 px-3 py-4 sm:px-5 lg:px-8">
        {/* RINGKASAN */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-blue-900">
              Total Suara Keseluruhan
            </p>
            <p className="mt-1 text-3xl font-black text-blue-900 sm:text-4xl">
              {formatNumber(totalVotes)}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Suara digital + suara manual
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-700">
              Jumlah Kandidat
            </p>
            <p className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">
              {formatNumber(results.length)}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Kandidat dalam penghitungan
            </p>
          </div>

          <div className="rounded-xl border border-green-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-green-800">
              Status Penghitungan
            </p>
            <p className="mt-1 text-2xl font-black text-green-700 sm:text-3xl">
              LIVE
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Diperbarui: {lastUpdated || '-'}
            </p>
          </div>
        </section>

        {/* KANDIDAT TERATAS */}
        <section>
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-800">
                Perolehan Suara
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                Kandidat Teratas
              </h2>
            </div>
            <p className="text-xs font-semibold text-slate-600 sm:text-sm">
              Berdasarkan total suara digital dan manual
            </p>
          </div>

          {topCandidates.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <p className="text-base font-bold text-slate-700">
                Belum ada data kandidat.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {topCandidates.map((candidate, index) => {
                const rank = index + 1;
                const style = rankStyles[index] ?? rankStyles[2];
                const percentage = Math.min(
                  100,
                  Math.max(0, candidate.percentage ?? 0),
                );

                return (
                  <article
                    key={candidate.candidate_id}
                    className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 ${style.border} bg-white shadow-md transition-shadow hover:shadow-lg`}
                  >
                    {/* JUDUL CARD */}
                    <div className="border-b border-slate-200 bg-blue-50 px-3 py-3 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700 sm:text-xs">
                        Pemilihan Ketua OSIS
                      </p>

                      <h3 className="mt-1 text-3xl font-black uppercase tracking-wide text-blue-950 sm:text-4xl">
                        PASLON {candidate.nomor_urut}
                      </h3>

                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-[10px] font-black ${style.badge}`}
                      >
                        {style.label}
                      </span>
                    </div>

                    {/* IDENTITAS */}
                    <div className="flex flex-1 flex-col p-3 sm:p-4">
                      <div className="flex flex-col items-center text-center">
                        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-36 sm:w-36 lg:h-40 lg:w-40">
                          {candidate.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={candidate.foto_url}
                              alt={`Foto ${getCandidateName(candidate)}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-4xl font-black text-slate-500">
                              {candidate.nomor_urut}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 w-full break-words text-lg font-black leading-snug text-slate-900 sm:text-xl">
                          {getCandidateName(candidate)}
                        </h3>

                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">
                          Calon Ketua OSIS
                        </p>

                        <div className="my-3 h-px w-full bg-slate-200" />

                        <p className="w-full break-words text-base font-black leading-snug text-slate-800 sm:text-lg">
                          {getViceName(candidate)}
                        </p>

                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">
                          Calon Wakil Ketua OSIS
                        </p>
                      </div>

                      {/* SUARA DIGITAL */}
                      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
                        <p className="text-xs font-black uppercase tracking-wide text-blue-900">
                          Suara Digital
                        </p>
                        <p className="mt-1 text-2xl font-black text-blue-900 sm:text-3xl">
                          {formatNumber(candidate.digital_vote_count)}
                        </p>
                      </div>

                      {/* TOTAL SUARA */}
                      <div className="mt-2 rounded-xl bg-blue-800 px-3 py-2.5 text-white">
                        <p className="text-xs font-black uppercase tracking-wide text-blue-100">
                          Total Suara Keseluruhan
                        </p>
                        <p className="mt-1 text-3xl font-black sm:text-4xl">
                          {formatNumber(candidate.vote_count)}
                        </p>
                      </div>

                      {/* PERSENTASE */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600">
                            Persentase suara
                          </span>
                          <span className={`text-lg font-black ${style.text}`}>
                            {formatPercentage(candidate.percentage)}
                          </span>
                        </div>

                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${style.bar} transition-all duration-700`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* RANKING SELURUH KANDIDAT */}
        <section>
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-800">
              Peringkat Kandidat
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
              Ranking Perolehan Suara
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-600 sm:text-sm">
              Ranking diperbarui otomatis berdasarkan total suara.
            </p>
          </div>

          {results.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-700">
              Belum ada hasil untuk ditampilkan.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="hidden grid-cols-[64px_minmax(180px,1fr)_120px_130px_110px] items-center gap-3 border-b border-slate-200 bg-blue-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-blue-950 lg:grid">
                <span>Rank</span>
                <span>Kandidat</span>
                <span>Suara Digital</span>
                <span>Total Suara</span>
                <span className="text-right">Persentase</span>
              </div>

              <div className="divide-y divide-slate-200">
                {results.map((candidate, index) => {
                  const rank = index + 1;
                  const percentage = Math.min(
                    100,
                    Math.max(0, candidate.percentage ?? 0),
                  );

                  return (
                    <div
                      key={candidate.candidate_id}
                      className="grid grid-cols-1 gap-3 px-3 py-4 transition hover:bg-blue-50 sm:px-4 lg:grid-cols-[64px_minmax(180px,1fr)_120px_130px_110px] lg:items-center lg:gap-3"
                    >
                      <div className="flex items-center gap-3 lg:block">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-black ${
                            rank === 1
                              ? 'bg-amber-400 text-slate-950'
                              : rank === 2
                                ? 'bg-slate-300 text-slate-950'
                                : rank === 3
                                  ? 'bg-orange-400 text-slate-950'
                                  : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {rank}
                        </span>
                        <span className="text-xs font-black uppercase text-slate-600 lg:hidden">
                          Peringkat {rank}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {candidate.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={candidate.foto_url}
                              alt={`Foto ${getCandidateName(candidate)}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-black text-slate-600">
                              {candidate.nomor_urut}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase text-blue-800">
                            Paslon {candidate.nomor_urut}
                          </p>
                          <p className="break-words text-sm font-black text-slate-900 sm:text-base">
                            {getCandidateName(candidate)}
                          </p>
                          <p className="break-words text-xs font-semibold text-slate-600">
                            Wakil: {getViceName(candidate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 lg:block">
                        <span className="text-xs font-bold text-slate-500 lg:hidden">
                          Suara Digital
                        </span>
                        <p className="text-xl font-black text-blue-900">
                          {formatNumber(candidate.digital_vote_count)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 lg:block">
                        <span className="text-xs font-bold text-slate-500 lg:hidden">
                          Total Suara
                        </span>
                        <p className="text-2xl font-black text-blue-900">
                          {formatNumber(candidate.vote_count)}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-3 lg:justify-end">
                          <span className="text-xs font-bold text-slate-500 lg:hidden">
                            Persentase
                          </span>
                          <span className="text-base font-black text-slate-900">
                            {formatPercentage(candidate.percentage)}
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-blue-700 transition-all duration-700"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="border-t border-slate-300 py-4 text-center">
          <p className="text-sm font-black text-slate-800 sm:text-base">
            PILKETOS SMK TERATAI PUTIH GLOBAL 4 BEKASI
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
            Total suara merupakan gabungan suara digital dan suara manual.
            Suara digital ditampilkan secara terpisah.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Data diperbarui otomatis setiap 5 detik.
          </p>

          <Link
            href="/"
            className="mt-4 inline-flex rounded-lg border border-blue-800 px-4 py-2 text-xs font-black text-blue-900 transition hover:bg-blue-50"
          >
            Kembali ke Beranda
          </Link>
        </footer>
      </div>
    </main>
  );
}