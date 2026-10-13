'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabaseAuth } from '@/lib/supabaseAuth';

type FilterType = 'all' | 'pkl' | 'non-pkl' | 'voted' | 'not-voted';

type Student = {
  id: string;
  nama: string;
  kelas: string;
  jurusan: string;
  status_pkl: boolean;
  eligible_for_online_voting?: boolean;
  has_voted: boolean;
  created_at: string | null;
  token?: string | null;
  is_test_account?: boolean;
};

type VotersResponse = {
  success?: boolean;
  error?: string;
  voters?: Student[];
  total?: number;
};

type ImportResponse = {
  message?: string;
  error?: string;
  details?: string[];
  hasil?: unknown;
  jumlahAkun?: number;
  peringatan?: string;
};

type CreateVoterResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  token?: string;
  voter?: Student;
  warning?: string;
};

type RegenerateResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  total?: number;
  file?: string;
};

const initialForm = {
  nama: '',
  kelas: '',
  jurusan: '',
  status_pkl: false,
  eligible_for_online_voting: false,
};

export default function AdminStudentsClient() {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [newToken, setNewToken] = useState('');
  const [newStudentName, setNewStudentName] = useState('');

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabaseAuth.auth.getSession();

      if (error || !data.session?.access_token) {
        throw new Error('Sesi admin tidak ditemukan. Silakan login kembali.');
      }

      const response = await fetch('/api/admin/voters', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
        cache: 'no-store',
      });

      const result = (await response.json()) as VotersResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengambil data pemilih.');
      }

      if (!Array.isArray(result.voters)) {
        throw new Error('Format data pemilih dari server tidak valid.');
      }

      setAllStudents(result.voters);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mengambil data pemilih.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStudents();
  }, [fetchStudents]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Token berhasil disalin.');
      setErrorMessage('');
    } catch {
      setErrorMessage(
        'Gagal menyalin. Pastikan halaman dibuka melalui localhost atau HTTPS.',
      );
    }
  };

  const copyToken = async (student: Student) => {
    if (!student.token || student.is_test_account) {
      setNotice('');
      setErrorMessage(
        `Token untuk ${student.nama} tidak tersedia. Token lama tidak dapat ditampilkan kembali melalui API daftar.`,
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(student.token);

      setCopiedStudentId(student.id);
      setNotice(`Token untuk ${student.nama} berhasil disalin.`);
      setErrorMessage('');

      window.setTimeout(() => {
        setCopiedStudentId((current) =>
          current === student.id ? null : current,
        );
      }, 2000);
    } catch {
      setErrorMessage(
        'Gagal menyalin token. Pastikan halaman dibuka melalui localhost atau HTTPS.',
      );
      setNotice('');
    }
  };

  const addStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSavingStudent(true);
    setErrorMessage('');
    setNotice('');
    setNewToken('');
    setNewStudentName('');

    try {
      const { data, error } = await supabaseAuth.auth.getSession();

      if (error || !data.session?.access_token) {
        throw new Error('Sesi admin tidak ditemukan. Silakan login kembali.');
      }

      const response = await fetch('/api/admin/voters/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        cache: 'no-store',
        body: JSON.stringify({
          nama: form.nama,
          kelas: form.kelas,
          jurusan: form.jurusan,
          status_pkl: form.status_pkl,
          eligible_for_online_voting: form.eligible_for_online_voting,
        }),
      });

      const result = (await response.json()) as CreateVoterResponse;

      if (!response.ok || !result.success || !result.token || !result.voter) {
        throw new Error(result.error || 'Gagal menambahkan pemilih.');
      }

      setNewToken(result.token);
      setNewStudentName(result.voter.nama);
      setNotice('Data pemilih berhasil ditambahkan.');

      setAllStudents((current) =>
        [
          ...current.filter((student) => student.id !== result.voter!.id),
          { ...result.voter!, token: null },
        ].sort((a, b) => a.nama.localeCompare(b.nama, 'id-ID')),
      );

      setForm(initialForm);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menambahkan pemilih.',
      );
    } finally {
      setSavingStudent(false);
    }
  };

  const importVoters = async () => {
    const confirmed = window.confirm(
      'PERINGATAN: Impor dapat mengganti data pemilih sesuai konfigurasi endpoint. Pastikan backup tersedia dan daftar telah diverifikasi. Lanjutkan?',
    );

    if (!confirmed) return;

    setImporting(true);
    setNotice('');
    setErrorMessage('');

    try {
      const { data, error } = await supabaseAuth.auth.getSession();

      if (error || !data.session?.access_token) {
        throw new Error('Sesi admin tidak ditemukan. Silakan login kembali.');
      }

      const response = await fetch('/api/admin/voters/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
        cache: 'no-store',
      });

      const result = (await response.json()) as ImportResponse;

      if (!response.ok) {
        const details = result.details?.length
          ? `\n${result.details.join('\n')}`
          : '';

        throw new Error(`${result.error || 'Impor gagal.'}${details}`);
      }

      setNewToken('');
      setNotice(
        `${result.message || 'Impor berhasil.'} Jumlah akun: ${
          result.jumlahAkun ?? 'tidak diketahui'
        }.`,
      );

      await fetchStudents();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mengimpor pemilih.',
      );
    } finally {
      setImporting(false);
    }
  };

  const regenerateTokens = async () => {
    const confirmed = window.confirm(
      'PERINGATAN PENTING: Token dan kode akses seluruh pemilih akan diganti. Token lama tidak berlaku lagi. Pastikan distribusi kredensial sudah disiapkan. Lanjutkan?',
    );

    if (!confirmed) return;

    setRegenerating(true);
    setNotice('');
    setErrorMessage('');

    try {
      const { data, error } = await supabaseAuth.auth.getSession();

      if (error || !data.session?.access_token) {
        throw new Error('Sesi admin tidak ditemukan. Silakan login kembali.');
      }

      const response = await fetch('/api/admin/voters/regenerate-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        cache: 'no-store',
        body: JSON.stringify({
          confirm: 'REGENERATE_ALL_TOKENS',
        }),
      });

      const result = (await response.json()) as RegenerateResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Regenerasi token gagal.');
      }

      setNewToken('');
      setNewStudentName('');

      setNotice(
        `${result.message || 'Regenerasi berhasil.'} Total: ${
          result.total ?? 0
        }. File: ${result.file ?? 'tidak diketahui'}`,
      );

      await fetchStudents();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat regenerasi token.',
      );
    } finally {
      setRegenerating(false);
    }
  };

  const downloadCredentials = async () => {
    setDownloading(true);
    setErrorMessage('');
    setNotice('');

    try {
      const { data, error } = await supabaseAuth.auth.getSession();

      if (error || !data.session?.access_token) {
        throw new Error('Sesi admin tidak ditemukan. Silakan login kembali.');
      }

      const response = await fetch(
        '/api/admin/voters/download-credentials',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
          cache: 'no-store',
        },
      );

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || 'Gagal mengunduh kredensial.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'kredensial-pemilih.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setNotice('File kredensial berhasil diunduh. Simpan dengan aman.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mengunduh kredensial.',
      );
    } finally {
      setDownloading(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');

    return allStudents.filter((student) => {
      const matchSearch =
        student.nama.toLocaleLowerCase('id-ID').includes(query) ||
        student.kelas.toLocaleLowerCase('id-ID').includes(query) ||
        student.jurusan.toLocaleLowerCase('id-ID').includes(query);

      const matchFilter =
        filter === 'all' ||
        (filter === 'pkl' && student.status_pkl) ||
        (filter === 'non-pkl' && !student.status_pkl) ||
        (filter === 'voted' && student.has_voted) ||
        (filter === 'not-voted' && !student.has_voted);

      return matchSearch && matchFilter;
    });
  }, [allStudents, search, filter]);

  const filterButtons: {
    key: FilterType;
    label: string;
    count: number;
  }[] = [
    { key: 'all', label: 'Semua', count: allStudents.length },
    {
      key: 'pkl',
      label: 'PKL',
      count: allStudents.filter((student) => student.status_pkl).length,
    },
    {
      key: 'non-pkl',
      label: 'Bukan PKL',
      count: allStudents.filter((student) => !student.status_pkl).length,
    },
    {
      key: 'voted',
      label: 'Sudah Voting',
      count: allStudents.filter((student) => student.has_voted).length,
    },
    {
      key: 'not-voted',
      label: 'Belum Voting',
      count: allStudents.filter((student) => !student.has_voted).length,
    },
  ];

  const busy = loading || importing || savingStudent || regenerating || downloading;

  return (
    <AdminLayout
      title="Data Pemilih"
      subtitle="Daftar pemilih dari database Supabase"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <input
              type="text"
              placeholder="Cari nama, kelas, atau jurusan..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full flex-1 rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />

            <button
              type="button"
              onClick={() => {
                setShowAddForm((current) => !current);
                setNewToken('');
                setErrorMessage('');
              }}
              disabled={busy}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showAddForm ? 'Tutup Form' : '+ Tambah Data'}
            </button>

            <button
              type="button"
              onClick={() => void fetchStudents()}
              disabled={busy}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Memuat...' : 'Muat ulang'}
            </button>

            <button
              type="button"
              onClick={() => void importVoters()}
              disabled={busy}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? 'Mengimpor...' : 'Impor Pemilih'}
            </button>

            <button
              type="button"
              onClick={() => void regenerateTokens()}
              disabled={busy}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {regenerating
                ? 'Memproses Token...'
                : 'Regenerasi Token Pemilih'}
            </button>

            <button
              type="button"
              onClick={() => void downloadCredentials()}
              disabled={busy}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? 'Mengunduh...' : 'Unduh Kredensial CSV'}
            </button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Pastikan backup tersedia sebelum impor atau regenerasi kredensial.
            Regenerasi mengganti token dan kode akses semua pemilih.
          </p>

          {showAddForm && (
            <form
              onSubmit={addStudent}
              className="mt-5 rounded-2xl border border-border bg-background p-4 sm:p-5"
            >
              <h2 className="text-lg font-bold text-foreground">
                Tambah Pemilih Baru
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Token akan dibuat otomatis setelah data berhasil disimpan.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-foreground">
                  Nama lengkap
                  <input
                    required
                    maxLength={200}
                    value={form.nama}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nama: event.target.value,
                      }))
                    }
                    placeholder="Masukkan nama lengkap"
                    className="mt-1.5 w-full rounded-xl border border-border bg-input px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>

                <label className="text-sm font-medium text-foreground">
                  Kelas
                  <input
                    required
                    maxLength={100}
                    value={form.kelas}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        kelas: event.target.value,
                      }))
                    }
                    placeholder="Contoh: 12 RPL"
                    className="mt-1.5 w-full rounded-xl border border-border bg-input px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>

                <label className="text-sm font-medium text-foreground sm:col-span-2">
                  Jurusan
                  <input
                    required
                    maxLength={200}
                    value={form.jurusan}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        jurusan: event.target.value,
                      }))
                    }
                    placeholder="Contoh: RPL"
                    className="mt-1.5 w-full rounded-xl border border-border bg-input px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              </div>

              <div className="mt-4 space-y-3">
                <label className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <input
                    type="checkbox"
                    checked={form.status_pkl}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status_pkl: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4"
                  />
                  <span className="text-sm">
                    <span className="block font-semibold text-foreground">
                      Pemilih sedang PKL
                    </span>
                    <span className="mt-1 block text-muted-foreground">
                      Centang hanya jika status PKL siswa sudah terverifikasi.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <input
                    type="checkbox"
                    checked={form.eligible_for_online_voting}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        eligible_for_online_voting: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4"
                  />
                  <span className="text-sm">
                    <span className="block font-semibold text-amber-900">
                      Disetujui panitia untuk voting online
                    </span>
                    <span className="mt-1 block text-amber-800">
                      Centang hanya jika panitia telah menyetujui siswa non-PKL
                      mengikuti voting online.
                    </span>
                  </span>
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingStudent ? 'Menyimpan...' : 'Simpan Pemilih'}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setShowAddForm(false);
                    setForm(initialForm);
                    setErrorMessage('');
                  }}
                  className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {newToken && (
            <div className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 sm:p-5">
              <h3 className="font-bold text-emerald-900">
                Pemilih berhasil ditambahkan!
              </h3>

              <p className="mt-1 text-sm text-emerald-800">
                Token untuk <strong>{newStudentName}</strong> ditampilkan
                sekarang. Salin dan simpan di tempat aman sebelum menutup panel.
              </p>

              <code className="mt-3 block break-all rounded-xl border border-emerald-200 bg-white p-3 text-sm font-bold tracking-wider text-emerald-950">
                {newToken}
              </code>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyText(newToken)}
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Salin Token
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewToken('');
                    setNewStudentName('');
                  }}
                  className="rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                >
                  Sembunyikan Token
                </button>
              </div>

              <p className="mt-3 text-xs text-emerald-800">
                Token tidak dapat dimunculkan kembali dari panel ini setelah
                disembunyikan atau halaman ditutup.
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {filterButtons.map((button) => (
              <button
                key={button.key}
                type="button"
                onClick={() => setFilter(button.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === button.key
                    ? 'bg-accent text-white'
                    : 'bg-muted text-muted-foreground hover:bg-secondary'
                }`}
              >
                {button.label}
                <span className="rounded-full bg-background/30 px-1.5 py-0.5">
                  {button.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className="m-4 whitespace-pre-wrap rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <p>{notice}</p>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="m-4 whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p>{errorMessage}</p>

            <button
              type="button"
              onClick={() => void fetchStudents()}
              disabled={busy}
              className="mt-2 font-semibold underline disabled:opacity-50"
            >
              Muat ulang data
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Nama
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Kelas
                </th>
                <th className="hidden px-4 py-3 text-left text-xs uppercase text-muted-foreground md:table-cell">
                  Jurusan
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Token Pemilih
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Status PKL
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Status Voting
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm">
                    Memuat data pemilih...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                  >
                    {errorMessage
                      ? 'Data belum berhasil dimuat.'
                      : 'Tidak ada pemilih yang sesuai filter.'}
                  </td>
                </tr>
              ) : (
                filtered.map((student, index) => (
                  <tr
                    key={student.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {index + 1}
                    </td>

                    <td className="px-4 py-3.5 text-sm font-semibold text-foreground">
                      {student.nama}
                    </td>

                    <td className="px-4 py-3.5 text-sm text-foreground">
                      {student.kelas}
                    </td>

                    <td className="hidden px-4 py-3.5 text-sm text-muted-foreground md:table-cell">
                      {student.jurusan}
                    </td>

                    <td className="px-4 py-3.5">
                      {student.is_test_account ? (
                        <span className="text-xs text-muted-foreground">
                          Akun pengujian
                        </span>
                      ) : student.token ? (
                        <div className="flex min-w-40 flex-col items-start gap-2">
                          <code className="rounded-lg bg-muted px-2 py-1 text-xs font-semibold tracking-wider text-foreground">
                            {student.token}
                          </code>

                          <button
                            type="button"
                            onClick={() => void copyToken(student)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                          >
                            {copiedStudentId === student.id
                              ? 'Tersalin'
                              : 'Salin Token'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700">
                          Token tidak ditampilkan
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-sm">
                      {student.status_pkl ? (
                        <span className="font-semibold text-emerald-700">
                          PKL
                        </span>
                      ) : (
                        <div>
                          <span className="text-muted-foreground">
                            Bukan PKL
                          </span>
                          {student.eligible_for_online_voting && (
                            <span className="mt-1 block text-xs font-semibold text-emerald-700">
                              Disetujui voting online
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-sm">
                      {student.has_voted ? (
                        <span className="font-semibold text-emerald-700">
                          Sudah Voting
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700">
                          Belum Voting
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Menampilkan {loading ? 0 : filtered.length} dari{' '}
            {allStudents.length} pemilih
          </p>

          <p className="text-xs text-muted-foreground">
            Token baru ditampilkan satu kali setelah pembuatan.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
