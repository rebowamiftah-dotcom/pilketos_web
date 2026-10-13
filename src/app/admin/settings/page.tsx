'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { supabaseAuth } from '@/lib/supabaseAuth';

type ElectionSettings = {
  voting_start_at: string | null;
  voting_end_at: string | null;
  results_publish_at: string | null;
};

function toLocalInput(value: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

export default function ElectionSettingsPage() {
  const [settings, setSettings] = useState<ElectionSettings>({
    voting_start_at: null,
    voting_end_at: null,
    results_publish_at: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>(
    'success'
  );

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/election-status', {
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Gagal mengambil jadwal.');
        }

        if (result.schedule) {
          setSettings(result.schedule);
        }
      } catch (error) {
        setMessageType('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'Gagal mengambil jadwal pemilihan.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  function handleChange(
    field: keyof ElectionSettings,
    value: string
  ) {
    setSettings((previous) => ({
      ...previous,
      [field]: value || null,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (
      !settings.voting_start_at ||
      !settings.voting_end_at ||
      !settings.results_publish_at
    ) {
      setMessageType('error');
      setMessage('Semua tanggal dan waktu wajib diisi.');
      return;
    }

    const start = new Date(settings.voting_start_at).getTime();
    const end = new Date(settings.voting_end_at).getTime();
    const publish = new Date(settings.results_publish_at).getTime();

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      Number.isNaN(publish)
    ) {
      setMessageType('error');
      setMessage('Tanggal atau waktu tidak valid.');
      return;
    }

    if (start >= end) {
      setMessageType('error');
      setMessage(
        'Waktu mulai harus sebelum waktu penutupan voting.'
      );
      return;
    }

    if (publish < end) {
      setMessageType('error');
      setMessage(
        'Pengumuman hasil harus pada atau setelah voting ditutup.'
      );
      return;
    }

    setSaving(true);

    try {
      // Ambil sesi Supabase dari pengguna yang sedang login.
      const {
        data: { session },
        error: sessionError,
      } = await supabaseAuth.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error(
          'Sesi login tidak ditemukan. Silakan login kembali.'
        );
      }

      // Kirim token ke server agar API dapat memverifikasi admin.
      const response = await fetch('/api/admin/election-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          voting_start_at: new Date(
            settings.voting_start_at
          ).toISOString(),
          voting_end_at: new Date(
            settings.voting_end_at
          ).toISOString(),
          results_publish_at: new Date(
            settings.results_publish_at
          ).toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Gagal menyimpan jadwal pemilihan.'
        );
      }

      if (result.schedule) {
        setSettings(result.schedule);
      }

      setMessageType('success');
      setMessage(
        result.message || 'Jadwal pemilihan berhasil disimpan!'
      );
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menyimpan jadwal.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">
          Memuat jadwal pemilihan...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Pengaturan Pemilihan
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Atur jadwal pembukaan voting, penutupan voting, dan pengumuman
          hasil pemilihan ketua OSIS.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label
            htmlFor="voting-start"
            className="mb-2 block font-semibold text-slate-800"
          >
            Tanggal dan Jam Mulai Voting
          </label>

          <input
            id="voting-start"
            type="datetime-local"
            value={toLocalInput(settings.voting_start_at)}
            onChange={(event) =>
              handleChange('voting_start_at', event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label
            htmlFor="voting-end"
            className="mb-2 block font-semibold text-slate-800"
          >
            Tanggal dan Jam Penutupan Voting
          </label>

          <input
            id="voting-end"
            type="datetime-local"
            value={toLocalInput(settings.voting_end_at)}
            onChange={(event) =>
              handleChange('voting_end_at', event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label
            htmlFor="results-publish"
            className="mb-2 block font-semibold text-slate-800"
          >
            Tanggal dan Jam Pengumuman Hasil
          </label>

          <input
            id="results-publish"
            type="datetime-local"
            value={toLocalInput(settings.results_publish_at)}
            onChange={(event) =>
              handleChange('results_publish_at', event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        {message && (
          <div
            role="status"
            className={`rounded-lg border p-4 text-sm ${
              messageType === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? 'Menyimpan...'
            : 'Simpan Jadwal Pemilihan'}
        </button>
      </form>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Catatan:</strong> Waktu yang dipilih mengikuti zona
        waktu lokal perangkat. Pastikan perangkat admin menggunakan
        zona waktu WIB (Asia/Jakarta).
      </div>
    </div>
  );
}