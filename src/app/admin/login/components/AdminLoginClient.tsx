'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { supabaseAuth } from '@/lib/supabaseAuth';
import { setAdminSession } from '@/lib/sessionStore';

interface AdminLoginForm {
  email: string;
  password: string;
}

export default function AdminLoginClient() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginForm>({
    mode: 'onBlur',
  });

  const onSubmit = async (data: AdminLoginForm) => {
    setIsLoading(true);
    setLoginError(null);

    try {
      const { data: authData, error } = await supabaseAuth.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error || !authData.user || !authData.session) {
        console.error('Supabase login error:', error);

        setLoginError(error?.message || 'Akun tidak ditemukan atau belum berhasil login.');

        return;
      }

      // Pastikan akun yang masuk adalah akun admin.
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();

      if (!adminEmail || authData.user.email?.trim().toLowerCase() !== adminEmail) {
        await supabaseAuth.auth.signOut();

        setLoginError('Akun ini tidak memiliki akses sebagai admin.');

        return;
      }

      // Simpan penanda sesi untuk AdminLayout.
      setAdminSession();

      // Arahkan admin ke dashboard.
      router.replace('/admin');
      router.refresh();
    } catch (error) {
      console.error('Login gagal:', error);

      setLoginError('Tidak dapat menghubungi server. Periksa koneksi internet kamu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
      <div className="fixed inset-0 hero-gradient opacity-5 pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src="/images/TERPUT.jpg"
              alt="Logo PILKETOS"
              className="h-11 w-11 object-contain"
            />

            <div className="text-left">
              <div className="font-800 text-xl text-primary">PILKETOS</div>

              <div className="text-xs text-muted-foreground font-600">DIGITAL</div>
            </div>
          </div>

          <h1 className="text-2xl font-700 text-foreground">Admin PILKETOS</h1>

          <p className="text-muted-foreground text-sm mt-1">Dashboard monitoring pemilihan OSIS</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-modal p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>

            <h2 className="font-700 text-foreground">Masuk sebagai Admin</h2>
          </div>

          {loginError && (
            <div role="alert" className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-red-700 text-sm font-500">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-600 text-foreground mb-1.5">
                Email Admin
              </label>

              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="Masukkan email admin"
                className={`w-full px-4 py-3 rounded-xl border bg-input text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all ${
                  errors.email ? 'border-red-400 bg-red-50/50' : 'border-border'
                }`}
                {...register('email', {
                  required: 'Email wajib diisi.',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Format email tidak valid.',
                  },
                })}
              />

              {errors.email && (
                <p className="text-red-600 text-xs mt-1.5 font-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-600 text-foreground mb-1.5">
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border bg-input text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all ${
                    errors.password ? 'border-red-400 bg-red-50/50' : 'border-border'
                  }`}
                  {...register('password', {
                    required: 'Password wajib diisi.',
                    minLength: {
                      value: 6,
                      message: 'Password minimal 6 karakter.',
                    },
                  })}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {errors.password && (
                <p className="text-red-600 text-xs mt-1.5 font-500">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl btn-primary font-700 text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? 'Memeriksa akun...' : 'Masuk ke Dashboard'}
            </button>
          </form>
        </div>

        <div className="text-center mt-4">
          <a
            href="/"
            className="text-xs text-muted-foreground hover:text-accent transition-colors font-500"
          >
            &larr; Kembali ke halaman siswa
          </a>
        </div>
      </div>
    </div>
  );
}
