'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const steps = [
  {
    id: 'step-2',
    number: '01',
    title: 'Verifikasi Identitas',
    description:
      'Masukkan token, nama lengkap, kelas, dan jurusan Anda. Sistem akan memverifikasi bahwa Anda terdaftar sebagai pemilih.',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.7}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
        />
      </svg>
    ),
  },
  {
    id: 'step-3',
    number: '02',
    title: 'Pilih Pasangan Calon',
    description:
      'Baca visi dan misi setiap pasangan calon, kemudian pilih satu pasangan yang menurut Anda terbaik.',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.7}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: 'step-4',
    number: '03',
    title: 'Konfirmasi & Selesai',
    description:
      'Periksa dan konfirmasi pilihan Anda. Setelah berhasil dikirim, suara akan dicatat oleh sistem.',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.7}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
  },
];

type ElectionStatus = {
  votingOpen: boolean;
  votingClosed: boolean;
  resultsPublished: boolean;
};

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState<ElectionStatus | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    if (reducedMotion.matches) {
      setIsVisible(true);
    } else {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 },
      );

      observer.observe(section);

      // Simpan observer agar bisa dibersihkan.
      let isMounted = true;

      async function loadElectionStatus() {
        try {
          const response = await fetch('/api/election-status', {
            cache: 'no-store',
          });

          if (!response.ok) {
            throw new Error('Gagal mengambil status pemilihan');
          }

          const data: ElectionStatus = await response.json();

          if (isMounted) {
            setStatus(data);
          }
        } catch (error) {
          console.error('Gagal memeriksa jadwal voting:', error);
        }
      }

      loadElectionStatus();

      const interval = setInterval(loadElectionStatus, 30000);

      return () => {
        isMounted = false;
        observer.disconnect();
        clearInterval(interval);
      };
    }

    let isMounted = true;

    async function loadElectionStatus() {
      try {
        const response = await fetch('/api/election-status', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Gagal mengambil status pemilihan');
        }

        const data: ElectionStatus = await response.json();

        if (isMounted) {
          setStatus(data);
        }
      } catch (error) {
        console.error('Gagal memeriksa jadwal voting:', error);
      }
    }

    loadElectionStatus();

    const interval = setInterval(loadElectionStatus, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const votingOpen = status?.votingOpen === true;
  const votingClosed = status?.votingClosed === true;
  const resultsPublished = status?.resultsPublished === true;

  let buttonText = 'Memeriksa Jadwal...';
  let buttonHref = '#';
  let buttonDisabled = true;

  if (resultsPublished) {
    buttonText = 'Lihat Hasil Pemilihan';
    buttonHref = '/results';
    buttonDisabled = false;
  } else if (votingOpen) {
    buttonText = 'Mulai Voting Sekarang';
    buttonHref = '/voter-verification-screen';
    buttonDisabled = false;
  } else if (votingClosed) {
    buttonText = 'Voting Ditutup';
  } else if (status) {
    buttonText = 'Voting Belum Dibuka';
  }

  const revealClass = isVisible
    ? 'translate-y-0 opacity-100'
    : 'translate-y-8 opacity-0';

  return (
    <section
      ref={sectionRef}
      id="panduan-voting"
      className="bg-muted/50 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        {/* Judul */}
        <div
          className={`mb-12 text-center transition-[opacity,transform] duration-700 ease-out ${revealClass}`}
        >
          <h2 className="mb-4 text-3xl font-700 text-foreground sm:text-4xl">
            Cara Menggunakan Hak Suara
          </h2>

          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Proses voting hanya memerlukan beberapa langkah sederhana.
          </p>
        </div>

        {/* Tiga langkah voting */}
        <div className="mx-auto mb-12 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.id}
              className={`rounded-2xl border border-border bg-card p-7 transition-[opacity,transform,border-color] duration-700 ease-out hover:border-slate-300 ${revealClass}`}
              style={{
                transitionDelay: isVisible
                  ? `${150 + index * 180}ms`
                  : '0ms',
              }}
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  {step.icon}
                </div>

                <span className="text-2xl font-semibold text-slate-300">
                  {step.number}
                </span>
              </div>

              <h3 className="mb-3 text-base font-700 text-foreground">
                {step.title}
              </h3>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </article>
          ))}
        </div>

        {/* Tombol voting */}
        <div
          className={`text-center transition-[opacity,transform] duration-700 ease-out ${revealClass}`}
          style={{
            transitionDelay: isVisible ? '650ms' : '0ms',
          }}
        >
          {buttonDisabled ? (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2.5 rounded-2xl btn-primary px-8 py-4 text-base font-700 opacity-60"
            >
              {buttonText}
            </button>
          ) : (
            <Link
              href={buttonHref}
              className="inline-flex items-center gap-2.5 rounded-2xl btn-primary px-8 py-4 text-base font-700 transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              {buttonText}
            </Link>
          )}

          <p className="mt-3 text-sm text-muted-foreground">
            {resultsPublished
              ? 'Hasil pemilihan sudah dapat dilihat.'
              : votingOpen
                ? 'Pastikan Anda memenuhi persyaratan sebagai pemilih.'
                : votingClosed
                  ? 'Voting telah berakhir. Tunggu pengumuman hasil pemilihan.'
                  : 'Voting belum dibuka. Silakan periksa kembali sesuai jadwal.'}
          </p>
        </div>
      </div>
    </section>
  );
}