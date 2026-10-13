'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

type ElectionStatus = {
  votingOpen: boolean;
  votingClosed: boolean;
  resultsPublished: boolean;
};

export default function StudentNavbar() {
  const [status, setStatus] = useState<ElectionStatus | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkElectionStatus = async () => {
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
        console.error('Gagal memeriksa status pemilihan:', error);
      }
    };

    checkElectionStatus();

    const interval = setInterval(checkElectionStatus, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const votingOpen = status?.votingOpen === true;
  const votingClosed = status?.votingClosed === true;
  const resultsPublished = status?.resultsPublished === true;

  let buttonText = 'Memeriksa Jadwal...';
  let statusText = 'Memeriksa Jadwal';
  let buttonHref = '#';
  let buttonDisabled = true;

  if (resultsPublished) {
    buttonText = 'Lihat Hasil Pemilihan';
    statusText = 'Hasil Diumumkan';
    buttonHref = '/results';
    buttonDisabled = false;
  } else if (votingOpen) {
    buttonText = 'Mulai Voting';
    statusText = 'Voting Aktif';
    buttonHref = '/voter-verification-screen';
    buttonDisabled = false;
  } else if (votingClosed) {
    buttonText = 'Voting Ditutup';
    statusText = 'Voting Ditutup';
  } else if (status) {
    buttonText = 'Voting Belum Dibuka';
    statusText = 'Belum Dibuka';
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <img src="/images/TERPUT.jpg" alt="Logo PILKETOS" className="w-9 h-9 object-contain" />

            <div className="flex flex-col">
              <span className="font-bold text-base text-primary leading-tight tracking-tight">
                PILKETOS
              </span>

              <span className="text-xs text-muted-foreground font-medium leading-tight">
                DIGITAL
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-600 border border-accent/20">
              <span
                className={`w-1.5 h-1.5 rounded-full inline-block ${
                  votingOpen ? 'bg-emerald-500' : resultsPublished ? 'bg-blue-500' : 'bg-gray-400'
                }`}
              />

              {statusText}
            </span>

            {/* Tombol Login Admin */}
            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 transition text-sm font-semibold whitespace-nowrap"
            >
              Login Admin
            </Link>

            {/* Tombol Voting / Hasil tetap menggunakan logika sebelumnya */}
            {buttonDisabled ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-xl btn-primary text-sm font-600 opacity-60 cursor-not-allowed"
              >
                {buttonText}
              </button>
            ) : (
              <Link
                href={buttonHref}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-xl btn-primary text-sm font-600 whitespace-nowrap"
              >
                {buttonText}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
