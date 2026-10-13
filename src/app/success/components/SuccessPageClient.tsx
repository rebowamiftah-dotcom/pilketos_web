'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getVoterSession, clearVoterSession } from '@/lib/sessionStore';
import AppLogo from '@/components/ui/AppLogo';

export default function SuccessPageClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [voterName, setVoterName] = useState('');
  const [votedAt, setVotedAt] = useState('');

  useEffect(() => {
    setMounted(true);
    const session = getVoterSession();
    if (!session) {
      router.replace('/');
      return;
    }
    setVoterName(session.student.nama);
    // Format time statically to avoid locale hydration mismatch
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setVotedAt(`${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`);
    // Clear session after recording success
    clearVoterSession();
  }, [router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-emerald-50 blur-3xl opacity-60"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-accent/5 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2">
            <AppLogo size={40} />
            <span className="font-800 text-xl text-primary">PILKETOS DIGITAL</span>
          </div>
        </div>

        {/* Success card */}
        <div className="bg-card rounded-3xl border border-border shadow-modal p-8 text-center slide-up">
          {/* Success icon */}
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                className="checkmark-path"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-800 text-foreground mb-2">Voting Berhasil!</h1>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            Terima kasih telah menggunakan hak suara Anda.
          </p>

          {/* Voter info */}
          {voterName && (
            <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Pemilih</span>
              </div>
              <p className="font-700 text-foreground text-sm">{voterName}</p>
              {votedAt && (
                <p className="text-xs text-muted-foreground mt-1">Waktu voting: {votedAt}</p>
              )}
            </div>
          )}

          {/* Confirmation message */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-emerald-700 text-xs font-500 text-left leading-relaxed">
                Suara Anda telah tercatat dengan aman dalam sistem.
                Anda tidak dapat melakukan voting kembali menggunakan token ini.
              </p>
            </div>
          </div>

          {/* Privacy notice */}
          <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-xl mb-6">
            <svg className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-muted-foreground text-left leading-relaxed">
              Pilihan Anda bersifat rahasia. Sistem tidak menyimpan informasi tentang siapa memilih siapa.
            </p>
          </div>

          {/* Home button only — no back to voting */}
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-muted text-foreground rounded-xl font-600 text-sm hover:bg-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Kembali ke Beranda
          </a>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          PILKETOS DIGITAL &bull; Pemilihan OSIS 2026
        </p>
      </div>
    </div>
  );
}