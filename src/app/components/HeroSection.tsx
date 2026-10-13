'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type ElectionStatus = {
  votingOpen: boolean;
  votingClosed: boolean;
  resultsPublished: boolean;
};

export default function HeroSection() {
  const [status, setStatus] = useState<ElectionStatus | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Memulai animasi setelah komponen tampil
    const frame = requestAnimationFrame(() => {
      setHasMounted(true);
    });

    let active = true;

    async function loadElectionStatus() {
      try {
        const response = await fetch('/api/election-status', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Gagal mengambil status pemilihan');
        }

        const data: ElectionStatus = await response.json();

        if (active) {
          setStatus(data);
        }
      } catch (error) {
        console.error('Gagal membaca status pemilihan:', error);
      }
    }

    loadElectionStatus();

    const interval = setInterval(loadElectionStatus, 30000);

    return () => {
      cancelAnimationFrame(frame);
      active = false;
      clearInterval(interval);
    };
  }, []);

  const votingOpen = status?.votingOpen === true;
  const resultsPublished = status?.resultsPublished === true;

  let buttonText = 'Memeriksa Jadwal...';
  let statusText = 'Memuat jadwal pemilihan';

  if (status) {
    if (resultsPublished) {
      buttonText = 'Lihat Hasil Pemilihan';
      statusText = 'Hasil pemilihan sudah diumumkan';
    } else if (votingOpen) {
      buttonText = 'Mulai Voting';
      statusText = 'Voting sedang berlangsung';
    } else if (status.votingClosed) {
      buttonText = 'Voting Ditutup';
      statusText = 'Voting telah berakhir';
    } else {
      buttonText = 'Voting Belum Dibuka';
      statusText = 'Menunggu jadwal pemilihan';
    }
  }

  const buttonHref = resultsPublished
    ? '/results'
    : '/voter-verification-screen';

  const buttonEnabled = votingOpen || resultsPublished;

  const entrance = (delay: number) =>
    `transform-gpu transition-[opacity,transform] duration-700 ease-out ${
      hasMounted
        ? 'translate-y-0 scale-100 opacity-100'
        : 'translate-y-6 scale-[0.98] opacity-0'
    }`;

  return (
    <section className="relative isolate overflow-hidden bg-blue-950">
      {/* Background foto pasangan calon */}
      <div
        className="absolute inset-0 -z-20 bg-no-repeat"
        style={{
          backgroundImage: "url('/images/paslon-background.jpg')",
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />

      {/* Overlay */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-950/75 via-blue-900/80 to-blue-950/95"
        aria-hidden="true"
      />

      {/* Dekorasi */}
      <div
        className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl"
        aria-hidden="true"
      />

      {/* Konten */}
      <div className="relative mx-auto w-full max-w-screen-xl px-4 py-16 text-center sm:px-6 sm:py-20 md:py-24 lg:px-8 lg:py-28">
        {/* Badge */}
        <div
          className={`${entrance(0)} mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-md sm:text-sm`}
          style={{ transitionDelay: hasMounted ? '100ms' : '0ms' }}
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              votingOpen ? 'bg-emerald-400' : 'bg-amber-300'
            }`}
          />
          PEMILIHAN KETUA &amp; WAKIL OSIS
        </div>

        {/* Judul */}
        <h1
          className={`${entrance(1)} text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl`}
          style={{ transitionDelay: hasMounted ? '200ms' : '0ms' }}
        >
          PILKETOS
          <span className="block text-blue-300">DIGITAL</span>
        </h1>

        {/* Subjudul */}
        <p
          className={`${entrance(2)} mt-4 text-lg font-medium text-blue-100 sm:text-2xl md:text-3xl`}
          style={{ transitionDelay: hasMounted ? '300ms' : '0ms' }}
        >
          Pemilihan Ketua &amp; Wakil OSIS
        </p>

        {/* Deskripsi */}
        <p
          className={`${entrance(3)} mx-auto mt-5 max-w-2xl text-sm leading-7 text-blue-50/90 sm:text-base md:text-lg`}
          style={{ transitionDelay: hasMounted ? '400ms' : '0ms' }}
        >
          Kenali pasangan calon, pahami visi dan misinya, lalu gunakan hak
          suaramu untuk menentukan pemimpin OSIS berikutnya.
        </p>

        {/* Status pemilihan */}
        <div
          aria-live="polite"
          className={`${entrance(4)} mx-auto mt-6 inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm sm:text-sm`}
          style={{ transitionDelay: hasMounted ? '500ms' : '0ms' }}
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              resultsPublished
                ? 'bg-blue-300'
                : votingOpen
                  ? 'animate-pulse bg-emerald-400'
                  : 'bg-amber-300'
            }`}
          />
          <span>{statusText}</span>
        </div>

        {/* Tombol */}
        <div
          className={`${entrance(5)} mx-auto mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center`}
          style={{ transitionDelay: hasMounted ? '600ms' : '0ms' }}
        >
          {buttonEnabled ? (
            <Link
              href={buttonHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-950 shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-blue-50 active:scale-[0.98] sm:text-base"
            >
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {buttonText}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-white/60 px-6 py-3 text-sm font-bold text-blue-950/70 sm:text-base"
            >
              {buttonText}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              document.getElementById('panduan-voting')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.98] sm:text-base"
          >
            <svg
              className="h-5 w-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.247 18 16.5 18s-3.332.477-4.5 1.253"
              />
            </svg>
            Panduan Voting
          </button>
        </div>

        {/* Statistik */}
        <div
          className={`${entrance(6)} mx-auto mt-12 grid w-full max-w-2xl grid-cols-3 gap-2 sm:mt-16 sm:gap-4`}
          style={{ transitionDelay: hasMounted ? '700ms' : '0ms' }}
        >
          {[
            { value: '03', label: 'Pasangan Calon' },
            { value: '1x', label: 'Satu Suara' },
            { value: '100%', label: 'Aman & Tercatat' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex min-w-0 flex-col items-center justify-center rounded-xl border border-white/20 bg-white/10 px-2 py-4 shadow-sm backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/15 sm:rounded-2xl sm:px-4 sm:py-5"
            >
              <div className="text-xl font-extrabold text-white sm:text-3xl">
                {stat.value}
              </div>
              <div className="mt-1 text-center text-[10px] leading-4 text-blue-100 sm:text-xs">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}