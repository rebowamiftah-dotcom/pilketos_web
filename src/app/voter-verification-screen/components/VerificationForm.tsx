'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';

interface FormData {
  nama: string;
  kelas: string;
  jurusan: string;
}

type ApiError =
  | 'IDENTITY_NOT_FOUND'
  | 'NOT_ELIGIBLE'
  | 'INVALID_INPUT'
  | 'ALREADY_VOTED'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN_ERROR';

interface ApiResult {
  success?: boolean;
  message?: string;
  error?: ApiError;
}

const ERROR_MESSAGES: Record<ApiError, string> = {
  IDENTITY_NOT_FOUND:
    'Data pemilih tidak ditemukan. Periksa kembali nama, kelas, dan jurusan.',
  NOT_ELIGIBLE:
    'Kamu tidak memenuhi syarat untuk mengikuti pemilihan.',
  INVALID_INPUT:
    'Data yang dimasukkan tidak valid. Periksa kembali semua kolom.',
  ALREADY_VOTED:
    'Kamu sudah menggunakan hak pilih.',
  SESSION_EXPIRED:
    'Sesi verifikasi telah berakhir. Silakan ulangi verifikasi identitas.',
  UNKNOWN_ERROR:
    'Terjadi kesalahan sistem. Silakan coba kembali.',
};

export default function VerificationForm() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onBlur',
    defaultValues: {
      nama: '',
      kelas: '',
      jurusan: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const response = await fetch('/api/voter/verify-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({
          nama: data.nama.trim(),
          kelas: data.kelas.trim(),
          jurusan: data.jurusan.trim(),
        }),
      });

      const result: ApiResult = await response.json();

      if (!response.ok || !result.success) {
        const errorCode = result.error ?? 'UNKNOWN_ERROR';

        setServerError(
          ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.UNKNOWN_ERROR,
        );

        return;
      }

      // Identitas berhasil diverifikasi.
      // Lanjut ke halaman verifikasi token.
      router.replace('/voter-token-verification');
    } catch (error) {
      console.error('Identity verification failed:', error);

      setServerError(
        'Tidak dapat terhubung ke server. Periksa koneksi dan coba kembali.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputClassName =
    'w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 21a7 7 0 0114 0"
            />
          </svg>
        </div>

        <div>
          <h2 className="font-700 text-foreground text-lg">
            Verifikasi Identitas
          </h2>
          <p className="text-muted-foreground text-xs">
            Masukkan identitas sesuai data pemilih.
          </p>
        </div>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200"
        >
          <p className="text-red-700 text-sm">{serverError}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="nama"
            className="block text-sm font-600 text-foreground mb-1.5"
          >
            Nama Lengkap *
          </label>

          <input
            id="nama"
            type="text"
            autoComplete="name"
            maxLength={150}
            placeholder="Masukkan nama lengkap"
            disabled={isLoading}
            className={inputClassName}
            {...register('nama', {
              required: 'Nama lengkap wajib diisi.',
              maxLength: {
                value: 150,
                message: 'Nama terlalu panjang.',
              },
            })}
          />

          {errors.nama && (
            <p className="text-red-600 text-xs mt-1.5">
              {errors.nama.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="kelas"
            className="block text-sm font-600 text-foreground mb-1.5"
          >
            Kelas *
          </label>

          <input
            id="kelas"
            type="text"
            autoComplete="off"
            maxLength={50}
            placeholder="Contoh: XII RPL"
            disabled={isLoading}
            className={inputClassName}
            {...register('kelas', {
              required: 'Kelas wajib diisi.',
              maxLength: {
                value: 50,
                message: 'Kelas terlalu panjang.',
              },
            })}
          />

          {errors.kelas && (
            <p className="text-red-600 text-xs mt-1.5">
              {errors.kelas.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="jurusan"
            className="block text-sm font-600 text-foreground mb-1.5"
          >
            Jurusan *
          </label>

          <input
            id="jurusan"
            type="text"
            autoComplete="off"
            maxLength={100}
            placeholder="Contoh: Rekayasa Perangkat Lunak"
            disabled={isLoading}
            className={inputClassName}
            {...register('jurusan', {
              required: 'Jurusan wajib diisi.',
              maxLength: {
                value: 100,
                message: 'Jurusan terlalu panjang.',
              },
            })}
          />

          {errors.jurusan && (
            <p className="text-red-600 text-xs mt-1.5">
              {errors.jurusan.message}
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Semua kolom wajib diisi. Pastikan identitas sesuai dengan data
          yang terdaftar pada panitia pemilihan.
        </p>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-6 rounded-xl btn-primary font-700 text-base flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Memverifikasi...' : 'Verifikasi Identitas'}
        </button>
      </form>
    </div>
  );
}