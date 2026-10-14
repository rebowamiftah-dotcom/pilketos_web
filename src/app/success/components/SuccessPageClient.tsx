'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getVoterSession } from '@/lib/sessionStore';
import AppLogo from '@/components/ui/AppLogo';
import { supabaseAuth } from '@/lib/supabaseAuth';

interface VoterInfo {
  nama: string;
  kelas: string;
  jurusan: string;
  has_voted: boolean;
}

export default function SuccessPageClient() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [voter, setVoter] = useState<VoterInfo | null>(null);
  const [votedAt, setVotedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadVoterData() {
      try {
        const session = getVoterSession();

        if (!session) {
          router.replace('/');
          return;
        }

        // Gunakan identitas siswa dari sesi yang sudah terverifikasi.
        // Status voting tetap dibaca dari database.
        const student = session.student;

        const { data, error: queryError } = await supabaseAuth
          .from('voters')
          .select('nama, kelas, jurusan, has_voted')
          .eq('id', student.id)
          .maybeSingle();

        if (queryError) {
          throw queryError;
        }

        if (!data) {
          throw new Error('Data pemilih tidak ditemukan.');
        }

        if (cancelled) return;

        setVoter({
          nama: data.nama,
          kelas: data.kelas,
          jurusan: data.jurusan,
          has_voted: data.has_voted,
        });

        if (data.has_voted) {
          setVotedAt(
            new Date().toLocaleString('id-ID', {
              dateStyle: 'long',
              timeStyle: 'short',
              timeZone: 'Asia/Jakarta',
            }),
          );
        }

        setError('');
      } catch (err) {
        console.error('Gagal memuat data pemilih:', err);

        if (!cancelled) {
          setError(
            'Data pemilih belum dapat dimuat. Silakan kembali ke beranda dan periksa status voting Anda.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setMounted(true);
        }
      }
    }

    void loadVoterData();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!mounted || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Memuat data pemilih...
          </p>
        </div>
      </main>
    );
  }

  const hasVoted = voter?.has_voted === true;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* LOGO */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <AppLogo size={36} />
          <span className="text-lg font-extrabold tracking-tight text-blue-950">
            PILKETOS DIGITAL
          </span>
        </div>

        {/* CARD */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          {/* STATUS ICON */}
          <div
            className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
              error
                ? 'bg-amber-100'
                : hasVoted
                  ? 'bg-emerald-100'
                  : 'bg-slate-100'
            }`}
          >
            {error ? (
              <span className="text-3xl">!</span>
            ) : hasVoted ? (
              <svg
                className="h-9 w-9 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="h-9 w-9 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01"
                />
              </svg>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-slate-900">
              {error
                ? 'Data Belum Tersedia'
                : hasVoted
                  ? 'Voting Berhasil!'
                  : 'Belum Melakukan Voting'}
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {error
                ? 'Kami belum dapat memeriksa status voting dari database.'
                : hasVoted
                  ? 'Terima kasih telah menggunakan hak suara Anda.'
                  : 'Status database menunjukkan bahwa Anda belum melakukan voting.'}
            </p>
          </div>

          {/* DATA PEMILIH */}
          {voter && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Data Diri Pemilih
              </p>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Nama Lengkap
                  </p>
                  <p className="mt-0.5 break-words text-sm font-bold text-slate-900">
                    {voter.nama}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      Kelas
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {voter.kelas}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      Jurusan
                    </p>
                    <p className="mt-0.5 break-words text-sm font-bold text-slate-900">
                      {voter.jurusan}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STATUS VOTING */}
          {!error && voter && (
            <div
              className={`mt-4 rounded-2xl border p-4 ${
                hasVoted
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    hasVoted ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />

                <p
                  className={`text-sm font-extrabold ${
                    hasVoted ? 'text-emerald-800' : 'text-amber-800'
                  }`}
                >
                  Status: {hasVoted ? 'Sudah Voting' : 'Belum Voting'}
                </p>
              </div>

              {hasVoted && (
                <p className="mt-2 text-xs leading-relaxed text-emerald-700">
                  Status diambil dari database. Waktu berikut adalah waktu
                  halaman ini dibuka, bukan catatan waktu voting yang pasti.
                  {` ${votedAt}`}
                </p>
              )}
            </div>
          )}

          {/* PESAN ERROR */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs leading-relaxed text-red-700">{error}</p>
            </div>
          )}

          {/* PRIVASI */}
          <div className="mt-4 rounded-xl bg-blue-50 p-3">
            <p className="text-xs leading-relaxed text-blue-800">
              Kerahasiaan pilihan tetap dijaga. Halaman ini hanya menampilkan
              data pemilih dan status voting, bukan pasangan calon yang dipilih.
            </p>
          </div>

          {/* KEMBALI KE BERANDA */}
          <Link
            href="/"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6"
              />
            </svg>
            Kembali ke Beranda
          </Link>
        </section>

        <p className="mt-5 text-center text-xs text-slate-500">
          PILKETOS DIGITAL &bull; Pemilihan OSIS 2026
        </p>
      </div>
    </main>
  );
}