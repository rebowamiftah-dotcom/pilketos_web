'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type VoterIdentity = {
  nama: string;
  kelas: string;
  jurusan: string;
  token?: string;
};

export default function VoterTokenVerificationPage() {
  const router = useRouter();

  const [voter, setVoter] = useState<VoterIdentity | null>(null);
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(true);
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadIdentity = useCallback(async () => {
    setIsLoadingIdentity(true);
    setError('');

    try {
      const response = await fetch('/api/voter/identity', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (
          result.error === 'SESSION_EXPIRED' ||
          result.error === 'SESSION_NOT_FOUND'
        ) {
          router.replace('/voter-verification-screen');
          return;
        }

        if (result.error === 'NOT_ELIGIBLE') {
          setError('Anda tidak memenuhi syarat untuk mengikuti pemilihan.');
          return;
        }

        setError('Identitas tidak dapat dimuat. Silakan coba kembali.');
        return;
      }

      // Tampilkan identitas terlebih dahulu.
      setVoter(result.voter);

      // Token dimuat otomatis melalui API.
      const tokenResponse = await fetch('/api/voter/token-display', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });

      const tokenResult = await tokenResponse.json();

      if (tokenResponse.ok && tokenResult.success && tokenResult.voter?.token) {
        setVoter(tokenResult.voter);
      } else {
        // Identitas tetap ditampilkan meskipun token belum berhasil dimuat.
        setError(
          'Token belum dapat dimuat. Silakan hubungi panitia pemilihan.',
        );
      }
    } catch {
      setError('Tidak dapat terhubung ke server. Silakan coba kembali.');
    } finally {
      setIsLoadingIdentity(false);
    }
  }, [router]);

  useEffect(() => {
    void loadIdentity();
  }, [loadIdentity]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token.trim()) {
      setError('Silakan masukkan token yang ditampilkan di atas.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/voter/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({
          token: token.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (
          result.error === 'SESSION_EXPIRED' ||
          result.error === 'SESSION_NOT_FOUND'
        ) {
          setError(
            'Sesi verifikasi berakhir. Silakan verifikasi identitas kembali.',
          );
        } else if (result.error === 'INVALID_TOKEN') {
          setError('Token tidak valid. Periksa kembali token yang Anda masukkan.');
        } else if (result.error === 'ALREADY_VOTED') {
          setError('Anda sudah menggunakan hak pilih.');
        } else if (result.error === 'NOT_ELIGIBLE') {
          setError('Anda tidak memenuhi syarat untuk mengikuti pemilihan.');
        } else {
          setError('Verifikasi token gagal. Silakan coba kembali.');
        }

        return;
      }

      router.push('/voting-screen');
    } catch {
      setError('Tidak dapat terhubung ke server. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoadingIdentity) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary"
            aria-label="Memuat identitas"
          />
          <p className="text-sm text-muted-foreground">
            Memuat identitas dan token pemilih...
          </p>
        </div>
      </main>
    );
  }

  if (!voter) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-card sm:p-8">
          <h1 className="text-xl font-bold text-foreground">
            Verifikasi Identitas
          </h1>

          <p role="alert" className="mt-4 text-sm text-red-600">
            {error || 'Identitas pemilih tidak ditemukan.'}
          </p>

          <button
            type="button"
            onClick={() => router.replace('/voter-verification-screen')}
            className="mt-6 w-full rounded-xl btn-primary px-6 py-3 font-bold"
          >
            Kembali ke Verifikasi Identitas
          </button>

          <button
            type="button"
            onClick={() => void loadIdentity()}
            className="mt-3 w-full py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Coba Lagi
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2zm10-11V7a4 4 0 00-8 0v4"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-foreground">
            Verifikasi Token Pemilih
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Periksa identitas dan token Anda sebelum melanjutkan pemilihan.
          </p>
        </div>

        <div className="mb-6 space-y-4 rounded-xl border border-border bg-background p-4">
          <h2 className="text-sm font-bold text-foreground">
            Identitas Pemilih
          </h2>

          <div>
            <p className="text-xs text-muted-foreground">Nama Lengkap</p>
            <p className="mt-1 break-words text-sm font-semibold text-foreground">
              {voter.nama}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Kelas</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {voter.kelas}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Jurusan</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {voter.jurusan}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              Token Pemilih
            </p>

            {voter.token ? (
              <p className="mt-2 break-all rounded-lg border border-green-300 bg-green-50 p-3 font-mono text-base font-bold tracking-wider text-green-900">
                {voter.token}
              </p>
            ) : (
              <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                Token belum tersedia. Silakan coba muat ulang halaman.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="token"
              className="mb-2 block text-sm font-semibold text-foreground"
            >
              Masukkan Token untuk Verifikasi
            </label>

            <input
              id="token"
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={200}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Ketik token yang ditampilkan di atas"
              disabled={isLoading}
              className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !token.trim() || !voter.token}
            className="flex w-full items-center justify-center rounded-xl btn-primary px-6 py-3.5 text-base font-bold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Memverifikasi Token...' : 'Verifikasi Token'}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => router.push('/voter-verification-screen')}
            className="w-full py-2 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-60"
          >
            Kembali ke Verifikasi Identitas
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Jaga kerahasiaan token pemilih Anda.
        </p>
      </section>
    </main>
  );
}