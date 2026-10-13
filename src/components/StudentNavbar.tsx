'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type ElectionStatus = {
  votingOpen: boolean;
  votingClosed: boolean;
  resultsPublished: boolean;
};

export default function StudentNavbar() {
  const [status, setStatus] = useState<ElectionStatus | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            onClick={closeMenu}
            className="flex items-center gap-2 group"
          >
            <img
              src="/images/TERPUT.jpg"
              alt="Logo PILKETOS"
              className="w-9 h-9 object-contain"
            />

            <div className="flex flex-col">
              <span className="font-bold text-base text-primary leading-tight tracking-tight">
                PILKETOS
              </span>

              <span className="text-xs text-muted-foreground font-medium leading-tight">
                DIGITAL
              </span>
            </div>
          </Link>

          {/* Status pemilihan */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/20">
              <span
                className={`w-1.5 h-1.5 rounded-full inline-block ${
                  votingOpen
                    ? 'bg-emerald-500'
                    : resultsPublished
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
                }`}
              />

              {statusText}
            </span>

            {/* Tombol hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen((previous) => !previous)}
              aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={menuOpen}
              aria-controls="student-navbar-menu"
              className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {menuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Menu hamburger */}
        <div
          id="student-navbar-menu"
          className={`grid transition-all duration-300 ease-in-out ${
            menuOpen
              ? 'grid-rows-[1fr] opacity-100 pb-4'
              : 'grid-rows-[0fr] opacity-0'
          }`}
          aria-hidden={!menuOpen}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
              {/* Status pada layar kecil */}
              <div className="flex sm:hidden items-center gap-2 px-3 py-2 text-sm text-gray-600">
                <span
                  className={`w-2 h-2 rounded-full ${
                    votingOpen
                      ? 'bg-emerald-500'
                      : resultsPublished
                        ? 'bg-blue-500'
                        : 'bg-gray-400'
                  }`}
                />
                <span>{statusText}</span>
              </div>

              {/* Login Admin */}
              <Link
                href="/admin/login"
                onClick={closeMenu}
                tabIndex={menuOpen ? 0 : -1}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-50 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                >
                  <path d="M12 15v2" />
                  <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                  <rect x="5" y="10" width="14" height="11" rx="2" />
                </svg>
                Login Admin
              </Link>

              {/* Voting atau hasil */}
              {buttonDisabled ? (
                <button
                  type="button"
                  disabled
                  tabIndex={menuOpen ? 0 : -1}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl btn-primary text-sm font-semibold opacity-60 cursor-not-allowed"
                >
                  {buttonText}
                </button>
              ) : (
                <Link
                  href={buttonHref}
                  onClick={closeMenu}
                  tabIndex={menuOpen ? 0 : -1}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl btn-primary text-sm font-semibold hover:opacity-90 transition"
                >
                  {buttonText}

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
