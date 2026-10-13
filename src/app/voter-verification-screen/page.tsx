import React from 'react';
import StudentNavbar from '@/components/StudentNavbar';
import VerificationForm from './components/VerificationForm';
import LandingFooter from '../components/LandingFooter';

export default function VoterVerificationPage() {
  return (
    <div className="min-h-screen bg-background">
      <StudentNavbar />

      <main className="pt-24 pb-16">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-600 mb-4">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>

              Langkah 1 dari 2
            </div>

            <h1 className="text-3xl sm:text-4xl font-700 text-foreground mb-3">
              Verifikasi Pemilih
            </h1>

            <p className="text-muted-foreground text-base max-w-md mx-auto">
              Masukkan nama lengkap, kelas, dan jurusan sesuai data
              pendaftaran Anda.
            </p>
          </div>

          {/* Main form */}
          <div className="max-w-2xl mx-auto">
            <VerificationForm />
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}