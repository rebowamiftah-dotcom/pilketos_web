'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Candidate } from '@/lib/mockData';
import StudentNavbar from '@/components/StudentNavbar';
import CandidateCard from './CandidateCard';
import ConfirmationModal from './ConfirmationModal';
import VotingHeader from './VotingHeader';
import LandingFooter from '@/app/components/LandingFooter';

interface VoterSessionResponse {
  success: boolean;
  voter?: {
    nama: string;
    kelas: string;
    has_voted: boolean;
  };
  error?: string;
}

interface VoteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  SESSION_EXPIRED:
    'Sesi verifikasi berakhir. Silakan verifikasi identitas dan token kembali.',
  ALREADY_VOTED:
    'Hak pilih Anda sudah digunakan.',
  NOT_ELIGIBLE:
    'Anda tidak memenuhi syarat untuk memilih.',
  INVALID_CANDIDATE:
    'Pasangan calon tidak valid atau sudah tidak aktif.',
  VOTING_CLOSED:
    'Pemungutan suara sedang ditutup.',
  UNKNOWN_ERROR:
    'Terjadi kesalahan sistem. Silakan coba kembali.',
};

export default function VotingPageClient() {
  const router = useRouter();

  const [voterName, setVoterName] = useState('');
  const [voterKelas, setVoterKelas] = useState('');

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const [selectedCandidate, setSelectedCandidate] =
    useState<Candidate | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAccessChecked, setIsAccessChecked] = useState(false);

  // Memeriksa sesi melalui server, bukan sessionStorage.
  const checkAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/voter/session', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });

      const result: VoterSessionResponse = await response.json();

      if (!response.ok || !result.success || !result.voter) {
        router.replace('/voter-verification-screen');
        return;
      }

      if (result.voter.has_voted) {
        router.replace('/success');
        return;
      }

      setVoterName(result.voter.nama);
      setVoterKelas(result.voter.kelas);
      setIsAccessChecked(true);
    } catch (error) {
      console.error('Gagal memeriksa sesi pemilih:', error);
      router.replace('/voter-verification-screen');
    }
  }, [router]);

  // Mengambil daftar kandidat aktif dari server.
  const loadCandidates = useCallback(async () => {
    setIsLoadingCandidates(true);
    setCandidateError(null);

    try {
      const response = await fetch('/api/voting/candidates', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Gagal mengambil data pasangan calon.',
        );
      }

      if (!Array.isArray(result.candidates)) {
        throw new Error('Format data pasangan calon tidak valid.');
      }

      setCandidates(result.candidates as Candidate[]);
    } catch (error) {
      console.error('Gagal memuat kandidat:', error);

      setCandidateError(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mengambil data kandidat.',
      );
    } finally {
      setIsLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  useEffect(() => {
    if (isAccessChecked) {
      void loadCandidates();
    }
  }, [isAccessChecked, loadCandidates]);

  const handleSelectCandidate = (candidate: Candidate) => {
    if (isSubmitting) return;

    setSelectedCandidate(candidate);
    setSubmitError(null);
  };

  // Mengirim suara ke API server.
  const handleConfirmVote = async () => {
    if (!selectedCandidate || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/voting/cast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
        }),
      });

      const result: VoteResponse = await response.json();

      if (!response.ok || !result.success) {
        const errorCode = result.error ?? 'UNKNOWN_ERROR';

        setSubmitError(
          ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.UNKNOWN_ERROR,
        );

        setShowModal(false);

        if (
          errorCode === 'SESSION_EXPIRED' ||
          errorCode === 'NOT_ELIGIBLE'
        ) {
          router.replace('/voter-verification-screen');
        }

        if (errorCode === 'ALREADY_VOTED') {
          router.replace('/success');
        }

        return;
      }

      // Server sudah mencatat suara secara atomik.
      setShowModal(false);
      router.replace('/success');
    } catch (error) {
      console.error('Gagal mengirim suara:', error);

      setSubmitError(
        'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba kembali.',
      );

      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAccessChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-8 h-8 animate-spin text-accent mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />

            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l-2.647z"
            />
          </svg>

          <p className="text-muted-foreground text-sm font-500">
            Memverifikasi akses...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentNavbar />

      <main className="pt-20 pb-16">
        <VotingHeader
          voterName={voterName}
          voterKelas={voterKelas}
        />

        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-700 text-foreground mb-2">
              Pilih Pasangan Calon
            </h2>

            <p className="text-muted-foreground text-sm">
              Baca visi dan misi setiap pasangan, kemudian pilih satu
              pasangan yang Anda nilai terbaik.
            </p>
          </div>

          {/* Error pengiriman suara */}
          {submitError && (
            <div
              role="alert"
              className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 fade-in"
            >
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <p className="text-red-700 text-sm font-500">
                {submitError}
              </p>
            </div>
          )}

          {/* Daftar kandidat */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {isLoadingCandidates ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                Memuat pasangan calon...
              </div>
            ) : candidateError ? (
              <div className="col-span-full py-12 text-center">
                <p className="text-red-600 mb-3">
                  {candidateError}
                </p>

                <button
                  type="button"
                  onClick={() => void loadCandidates()}
                  className="btn-primary rounded-xl px-5 py-2"
                >
                  Coba Lagi
                </button>
              </div>
            ) : candidates.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                Belum ada pasangan calon yang aktif.
              </div>
            ) : (
              candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  isSelected={selectedCandidate?.id === candidate.id}
                  onSelect={() => handleSelectCandidate(candidate)}
                />
              ))
            )}
          </div>

          {/* Tombol konfirmasi */}
          <div className="flex justify-center">
            <div className="text-center">
              {selectedCandidate && (
                <p className="text-sm text-muted-foreground mb-3">
                  Anda memilih:{' '}
                  <span className="font-700 text-foreground">
                    Pasangan{' '}
                    {String(selectedCandidate.nomor_urut).padStart(2, '0')}
                    {' — '}
                    {selectedCandidate.nama_ketua}
                  </span>
                </p>
              )}

              <button
                type="button"
                onClick={() => setShowModal(true)}
                disabled={
                  !selectedCandidate ||
                  isLoadingCandidates ||
                  !!candidateError ||
                  isSubmitting
                }
                className="inline-flex items-center gap-2.5 px-8 py-4 btn-primary rounded-2xl font-700 text-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>

                {selectedCandidate
                  ? 'Konfirmasi Pilihan'
                  : 'Pilih Salah Satu Pasangan'}
              </button>

              {!selectedCandidate && (
                <p className="text-xs text-muted-foreground mt-2">
                  Klik kartu pasangan calon untuk memilih
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />

      {/* Modal konfirmasi */}
      {showModal && selectedCandidate && (
        <ConfirmationModal
          candidate={selectedCandidate}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirmVote}
          onCancel={() => {
            if (!isSubmitting) {
              setShowModal(false);
            }
          }}
        />
      )}
    </div>
  );
}