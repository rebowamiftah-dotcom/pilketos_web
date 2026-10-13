import React from 'react';
import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="relative overflow-hidden bg-slate-950 text-white">
      {/* Aksen dekoratif */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute -right-32 -top-40 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-screen-xl px-5 sm:px-8 lg:px-10">
        {/* Konten utama */}
        <div className="grid grid-cols-1 gap-10 py-12 sm:py-16 md:grid-cols-2 md:items-center md:gap-8">
          {/* Logo dan identitas */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <Link
              href="/"
              className="group flex items-center gap-3.5"
              aria-label="PILKETOS DIGITAL - Beranda"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white p-1.5 shadow-lg shadow-black/20">
                <img
                  src="/images/TERPUT.jpg"
                  alt="Logo Terput"
                  className="h-full w-full rounded-xl object-contain"
                />
              </div>

              <div>
                <h2 className="text-left text-lg font-bold tracking-wide text-white sm:text-xl">
                  PILKETOS
                  <span className="ml-1.5 font-normal text-blue-400">
                    DIGITAL
                  </span>
                </h2>

                <p className="mt-1 text-left text-sm text-slate-400">
                  Pemilihan OSIS Digital
                </p>
              </div>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
              Platform pemilihan Ketua dan Wakil Ketua OSIS yang dirancang
              untuk menghadirkan proses pemilihan yang tertib dan transparan.
            </p>
          </div>

          {/* Informasi pemilihan */}
          <div className="flex flex-col items-center md:items-end">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />

                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                  Informasi Pemilihan
                </p>
              </div>

              <h3 className="text-base font-semibold text-white sm:text-lg">
                Pemilihan Ketua &amp; Wakil OSIS
              </h3>

              <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-400">Periode</span>
                  <span className="text-right font-medium text-slate-200">
                    2026/2027
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-400">Peserta</span>
                  <span className="text-right font-medium text-slate-200">
                    Seluruh Siswa/i 
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Garis pemisah */}
        <div className="border-t border-white/10" />

        {/* Copyright */}
        <div className="flex flex-col items-center justify-between gap-4 py-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs leading-5 text-slate-500">
            &copy; 2026 PILKETOS DIGITAL. Hak cipta dilindungi.
          </p>

          <p className="max-w-md text-xs leading-5 text-slate-500 sm:text-right">
            Privasi pemilih merupakan prioritas dalam penyelenggaraan
            pemilihan digital.
          </p>
        </div>
      </div>
    </footer>
  );
}