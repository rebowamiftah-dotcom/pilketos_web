'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Candidate } from '@/lib/mockData';
import StudentNavbar from '@/components/StudentNavbar';
import CandidateCard from '@/app/voting-screen/components/CandidateCard';
import ConfirmationModal from '@/app/voting-screen/components/ConfirmationModal';
import LandingFooter from '@/app/components/LandingFooter';

export default function TestVotingPage() {
  const router = useRouter();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] =
    useState<Candidate | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCandidates() {
      try {
        const response = await fetch('/api/voting/candidates', {
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error('Gagal mengambil data kandidat.');
        }

        if (!cancelled) {
          setCandidates(result.candidates);
        }
      } catch {
        if (!cancelled) {
          setError('Gagal memuat kandidat. Silakan coba kembali.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCandidates();

    return () => {
      cancelled = true;
    };
  }, []);

  function confirmSimulation() {
    if (!selectedCandidate) return;

    // Simulasi lokal: tidak memanggil API voting resmi.
    setShowModal(false);
    setSuccess(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentNavbar />

      <main className="mx-auto max-w-screen-xl px-4 pb-16 pt-24">
        <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <h1 className="text-xl font-bold">
            Mode Simulasi Voting
          </h1>
          <p className="mt-1 text-sm">
            Halaman pengujian. Pilihan di sini tidak disimpan sebagai
            suara resmi.
          </p>
        </div>

        {success ? (
          <div className="mx-auto max-w-xl rounded-2xl border bg-card p-8 text-center">
            <h2 className="text-2xl font-bold">
              Simulasi Berhasil!
            </h2>

            <p className="mt-3 text-muted-foreground">
              {selectedCandidate
                ? `Kamu mencoba memilih Pasangan ${String(
                    selectedCandidate.nomor_urut,
                  ).padStart(2, '0')} — ${selectedCandidate.nama_ketua}.`
                : 'Simulasi selesai.'}
            </p>

            <p className="mt-2 text-sm font-semibold text-green-700">
              Tidak ada suara resmi yang disimpan.
            </p>

            <button
              type="button"
              onClick={() => {
                setSelectedCandidate(null);
                setSuccess(false);
              }}
              className="btn-primary mt-6 rounded-xl px-6 py-3"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-6 text-center text-2xl font-bold">
              Pilih Pasangan Calon
            </h2>

            {loading ? (
              <p className="py-10 text-center">
                Memuat pasangan calon...
              </p>
            ) : error ? (
              <p role="alert" className="py-10 text-center text-red-600">
                {error}
              </p>
            ) : candidates.length === 0 ? (
              <p className="py-10 text-center">
                Belum ada pasangan calon aktif.
              </p>
            ) : (
              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    isSelected={selectedCandidate?.id === candidate.id}
                    onSelect={() => setSelectedCandidate(candidate)}
                  />
                ))}
              </div>
            )}

            <div className="text-center">
              <button
                type="button"
                disabled={!selectedCandidate || loading || !!error}
                onClick={() => setShowModal(true)}
                className="btn-primary rounded-xl px-6 py-3 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Konfirmasi Simulasi
              </button>
            </div>
          </>
        )}
      </main>

      <LandingFooter />

      {showModal && selectedCandidate && (
        <ConfirmationModal
          candidate={selectedCandidate}
          isSubmitting={false}
          onConfirm={confirmSimulation}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}