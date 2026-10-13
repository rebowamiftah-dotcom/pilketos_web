'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import dynamic from 'next/dynamic';
import { supabaseAuth } from '@/lib/supabaseAuth';

const ResultsRadialChart = dynamic(
  () => import('./ResultsRadialChart'),
  { ssr: false }
);

const ResultsBarChartFull = dynamic(
  () => import('./ResultsBarChartFull'),
  { ssr: false }
);

type CandidateResult = {
  candidate_id: string;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  foto_url: string | null;
  digital_vote_count: number;
  manual_vote_count: number;
  vote_count: number;
  percentage: number;
};

type ResultsResponse = {
  resultsPublished?: boolean;
  publishAt?: string | null;
  totalDigitalVotes?: number;
  totalManualVotes?: number;
  totalVotes?: number;
  results?: CandidateResult[];
  error?: string;
};

type ManualVoteEntry = {
  candidate_id: string;
  vote_count: number;
  notes: string | null;
};

type ManualVoteResponse = {
  entries?: ManualVoteEntry[];
  error?: string;
};

type ParticipationResponse = {
  totalVoters?: number;
  votedVoters?: number;
  error?: string;
};

export default function AdminResultsClient() {
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [manualVotes, setManualVotes] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [totalVoters, setTotalVoters] = useState(0);
  const [votedVoters, setVotedVoters] = useState(0);

  const [loading, setLoading] = useState(true);
  const [savingCandidate, setSavingCandidate] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const totalDigitalVotes = results.reduce(
    (sum, item) => sum + item.digital_vote_count,
    0
  );

  const totalManualVotes = results.reduce(
    (sum, item) => sum + item.manual_vote_count,
    0
  );

  const totalVotes = results.reduce(
    (sum, item) => sum + item.vote_count,
    0
  );

  const participation =
    totalVoters > 0
      ? Math.round((votedVoters / totalVoters) * 100)
      : 0;

  const formatUpdated = () => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    }).format(new Date());
  };

  // Mengambil hasil suara digital dan kertas.
  const loadResults = useCallback(async () => {
    try {
      const sessionResult = await supabaseAuth.auth.getSession();
      const token = sessionResult.data.session?.access_token;

      if (!token) {
        throw new Error(
          'Sesi admin tidak ditemukan. Silakan login kembali.'
        );
      }

      const response = await fetch('/api/results?admin=true', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const data: ResultsResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Gagal mengambil hasil voting.'
        );
      }

      const nextResults = data.results ?? [];

      setResults(nextResults);

      // Isi nilai awal tanpa menimpa angka yang sedang diedit.
      setManualVotes((previous) => {
        const next = { ...previous };

        for (const item of nextResults) {
          if (!(item.candidate_id in next)) {
            next[item.candidate_id] = item.manual_vote_count;
          }
        }

        return next;
      });

      setLastUpdated(formatUpdated());
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan ketika mengambil hasil.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Mengambil statistik partisipasi melalui API admin.
  const loadParticipation = useCallback(async () => {
    try {
      const sessionResult = await supabaseAuth.auth.getSession();
      const token = sessionResult.data.session?.access_token;

      if (!token) return;

      const response = await fetch('/api/admin/participation', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) return;

      const data: ParticipationResponse = await response.json();

      setTotalVoters(Number(data.totalVoters ?? 0));
      setVotedVoters(Number(data.votedVoters ?? 0));
    } catch {
      // Kegagalan statistik tidak menghentikan hasil voting.
    }
  }, []);

  // Mengambil catatan suara kertas yang sudah tersimpan.
  const loadManualVotes = useCallback(async () => {
    try {
      const sessionResult = await supabaseAuth.auth.getSession();
      const token = sessionResult.data.session?.access_token;

      if (!token) return;

      const response = await fetch('/api/admin/manual-votes', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const data: ManualVoteResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Gagal mengambil rekap suara kertas.'
        );
      }

      if (data.entries) {
        setManualVotes((previous) => {
          const next = { ...previous };

          for (const entry of data.entries ?? []) {
            next[entry.candidate_id] = entry.vote_count;
          }

          return next;
        });

        setNotes((previous) => {
          const next = { ...previous };

          for (const entry of data.entries ?? []) {
            next[entry.candidate_id] = entry.notes ?? '';
          }

          return next;
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil rekap suara kertas.'
      );
    }
  }, []);

  useEffect(() => {
    void loadResults();
    void loadParticipation();
    void loadManualVotes();

    const interval = window.setInterval(() => {
      void loadResults();
      void loadParticipation();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadResults, loadParticipation, loadManualVotes]);

  // Menyimpan total suara kertas untuk satu pasangan calon.
  async function saveManualVotes(candidateId: string) {
    setSavingCandidate(candidateId);
    setError('');
    setSuccess('');

    try {
      const sessionResult = await supabaseAuth.auth.getSession();
      const token = sessionResult.data.session?.access_token;

      if (!token) {
        throw new Error(
          'Sesi admin tidak ditemukan. Silakan login kembali.'
        );
      }

      const voteCount = manualVotes[candidateId];

      if (
        !Number.isSafeInteger(voteCount) ||
        voteCount < 0
      ) {
        throw new Error(
          'Jumlah suara harus berupa bilangan bulat minimal 0.'
        );
      }

      const response = await fetch('/api/admin/manual-votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          candidateId,
          voteCount,
          notes: notes[candidateId] ?? '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Gagal menyimpan suara kertas.'
        );
      }

      setSuccess(
        'Rekap suara kertas berhasil disimpan.'
      );

      await loadResults();
      await loadManualVotes();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan ketika menyimpan suara.'
      );
    } finally {
      setSavingCandidate(null);
    }
  }

  const sorted = [...results].sort(
    (a, b) =>
      b.vote_count - a.vote_count ||
      a.nomor_urut - b.nomor_urut
  );

  const medals = ['🥇', '🥈', '🥉'];

  const rankColors = [
    'from-amber-400 to-yellow-300',
    'from-slate-400 to-slate-300',
    'from-amber-700 to-amber-600',
  ];

  return (
    <AdminLayout
      title="Hasil Voting"
      subtitle="Rekapitulasi suara digital dan kertas"
    >
      {/* Informasi privasi */}
      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="font-bold text-blue-900">
          Rekapitulasi suara
        </p>

        <p className="mt-1 text-sm text-blue-800">
          Pilihan individual pemilih tidak ditampilkan.
          Suara digital dan suara kertas dihitung terpisah
          sebelum dijumlahkan.
        </p>
      </div>

      {/* Status hasil */}
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Hasil Sementara
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Pembaruan terakhir: {lastUpdated || 'Memuat...'} WIB
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Belum Disahkan
        </span>
      </div>

      {/* Pesan error */}
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Pesan berhasil */}
      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          Memuat hasil dari database...
        </div>
      ) : (
        <>
          {/* Statistik utama */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: 'Total Suara',
                value: totalVotes,
                color: 'text-blue-800',
              },
              {
                label: 'Suara Digital',
                value: totalDigitalVotes,
                color: 'text-violet-700',
              },
              {
                label: 'Suara Kertas',
                value: totalManualVotes,
                color: 'text-emerald-700',
              },
              {
                label: 'Partisipasi Pemilih',
                value: `${participation}%`,
                color: 'text-amber-700',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm"
              >
                <div
                  className={`text-2xl font-extrabold tabular-nums ${item.color}`}
                >
                  {item.value.toLocaleString('id-ID')}
                </div>

                <div className="mt-1 text-xs font-semibold text-muted-foreground">
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Input suara kertas */}
          <section className="mb-8 rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-4 text-lg font-bold text-foreground">
              Input Suara Kertas
            </h3>

            <p className="mb-5 text-sm text-muted-foreground">
              Masukkan jumlah total suara kertas hasil
              penghitungan untuk setiap pasangan. Pastikan
              angka sesuai dengan formulir rekapitulasi.
            </p>

            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada pasangan calon aktif.
              </p>
            ) : (
              <div className="space-y-5">
                {results.map((candidate) => (
                  <div
                    key={candidate.candidate_id}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="mb-3">
                      <p className="font-bold text-foreground">
                        Pasangan{' '}
                        {String(candidate.nomor_urut).padStart(2, '0')}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {candidate.nama_ketua} &amp;{' '}
                        {candidate.nama_wakil}
                      </p>

                      <p className="mt-2 text-sm">
                        Suara digital:{' '}
                        <strong>
                          {candidate.digital_vote_count.toLocaleString('id-ID')}
                        </strong>
                      </p>

                      <p className="text-sm">
                        Suara kertas tersimpan:{' '}
                        <strong>
                          {candidate.manual_vote_count.toLocaleString('id-ID')}
                        </strong>
                      </p>
                    </div>

                    <label
                      htmlFor={`paper-${candidate.candidate_id}`}
                      className="mb-1 block text-sm font-semibold text-foreground"
                    >
                      Total suara kertas
                    </label>

                    <input
                      id={`paper-${candidate.candidate_id}`}
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={manualVotes[candidate.candidate_id] ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;

                        setManualVotes((previous) => ({
                          ...previous,
                          [candidate.candidate_id]:
                            value === '' ? 0 : Number(value),
                        }));
                      }}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <label
                      htmlFor={`notes-${candidate.candidate_id}`}
                      className="mb-1 mt-3 block text-sm font-semibold text-foreground"
                    >
                      Catatan rekap (opsional)
                    </label>

                    <input
                      id={`notes-${candidate.candidate_id}`}
                      type="text"
                      maxLength={500}
                      value={notes[candidate.candidate_id] ?? ''}
                      onChange={(event) =>
                        setNotes((previous) => ({
                          ...previous,
                          [candidate.candidate_id]: event.target.value,
                        }))
                      }
                      placeholder="Contoh: Rekap formulir kelas XI RPL 1"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <button
                      type="button"
                      disabled={
                        savingCandidate === candidate.candidate_id
                      }
                      onClick={() =>
                        void saveManualVotes(candidate.candidate_id)
                      }
                      className="mt-4 rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingCandidate === candidate.candidate_id
                        ? 'Menyimpan...'
                        : 'Simpan Rekap Suara Kertas'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Peringkat sementara */}
          <section className="mb-8">
            <h3 className="mb-4 text-lg font-bold text-foreground">
              Peringkat Sementara
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {sorted.map((candidate, index) => (
                <article
                  key={candidate.candidate_id}
                  className={`relative overflow-hidden rounded-2xl border-2 bg-card p-5 shadow-sm ${
                    index === 0
                      ? 'border-amber-300'
                      : 'border-border'
                  }`}
                >
                  {candidate.foto_url && (
                    <img
                      src={candidate.foto_url}
                      alt={`Foto pasangan ${candidate.nomor_urut}`}
                      className="mb-4 h-48 w-full rounded-xl object-cover"
                    />
                  )}

                  <p className="text-2xl">
                    {medals[index] ?? '🏅'}
                  </p>

                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Peringkat {index + 1}
                  </p>

                  <p className="mt-1 font-extrabold text-foreground">
                    Pasangan{' '}
                    {String(candidate.nomor_urut).padStart(2, '0')}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {candidate.nama_ketua} &amp; {candidate.nama_wakil}
                  </p>

                  <p className="mt-4 text-3xl font-extrabold text-blue-900">
                    {candidate.vote_count.toLocaleString('id-ID')}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    suara gabungan
                  </p>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full bg-gradient-to-r ${
                        rankColors[index] ?? rankColors[2]
                      } transition-all duration-500`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, candidate.percentage)
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {candidate.percentage.toLocaleString('id-ID')}%
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* Grafik */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-1 font-bold text-foreground">
                Distribusi Suara
              </h3>

              <p className="mb-4 text-xs text-muted-foreground">
                Perbandingan total suara digital dan kertas.
              </p>

              <ResultsBarChartFull aggregates={results} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-1 font-bold text-foreground">
                Partisipasi Pemilih
              </h3>

              <p className="mb-4 text-xs text-muted-foreground">
                Berdasarkan data pemilih yang telah memberikan suara digital.
              </p>

              <ResultsRadialChart
                voted={votedVoters}
                total={totalVoters}
                percentage={participation}
              />
            </div>
          </section>

          {/* Peringatan */}
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Catatan:</strong> peringkat di atas masih bersifat
            sementara. Jangan menetapkan struktur Ketua, Wakil Ketua,
            Sekretaris, atau Bendahara sebelum seluruh suara digital
            dan kertas diverifikasi.
          </div>
        </>
      )}
    </AdminLayout>
  );
}