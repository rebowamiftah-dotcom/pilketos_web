'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabaseAuth } from '@/lib/supabaseAuth';

type Candidate = {
  id: string;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  visi: string | null;
  misi: string | null;
  foto_url: string | null;
  is_active: boolean;
  created_at?: string;
};

type CandidateForm = {
  nomor_urut: string;
  nama_ketua: string;
  nama_wakil: string;
  visi: string;
  misi: string;
  foto_url: string;
};

const emptyForm: CandidateForm = {
  nomor_urut: '',
  nama_ketua: '',
  nama_wakil: '',
  visi: '',
  misi: '',
  foto_url: '',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AdminCandidatesClient() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [votingActive, setVotingActive] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CandidateForm>(emptyForm);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);

  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Mengambil token sesi admin.
  const getToken = async (): Promise<string> => {
    const { data, error } = await supabaseAuth.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error(
        'Sesi admin tidak ditemukan. Silakan login kembali.'
      );
    }

    return data.session.access_token;
  };

  // Mengambil daftar pasangan calon dari API.
  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();

      const response = await fetch('/api/admin/candidates', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Gagal mengambil data pasangan calon.'
        );
      }

      setCandidates(result.candidates ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mengambil data.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Memeriksa status pemilihan dari API.
  const loadVotingStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/election-status', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Gagal membaca status voting.');
      }

      const result = await response.json();

      if (typeof result.votingOpen !== 'boolean') {
        throw new Error(
          'Format status voting dari server tidak valid.'
        );
      }

      setVotingActive(result.votingOpen);
    } catch (error) {
      console.error('Gagal membaca status voting:', error);

      // Jika status gagal dibaca, kunci perubahan kandidat.
      setVotingActive(true);
    }
  }, []);

  // Memuat data awal dan memperbarui status voting setiap 60 detik.
  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadCandidates();
      void loadVotingStatus();
    }, 0);

    const interval = window.setInterval(() => {
      void loadVotingStatus();
    }, 60000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadCandidates, loadVotingStatus]);

  // Membersihkan URL pratinjau gambar saat tidak digunakan.
  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Mengosongkan formulir.
  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSelectedFile(null);
    setPreviewUrl('');
    setFileInputKey((previous) => previous + 1);
  };

  // Membuka formulir tambah pasangan calon.
  const openAddForm = () => {
    if (votingActive) {
      setErrorMessage(
        'Data pasangan calon tidak dapat diubah selama voting berlangsung.'
      );
      return;
    }

    resetForm();
    setMessage('');
    setErrorMessage('');
    setFormOpen(true);
  };

  // Membuka formulir edit pasangan calon.
  const openEditForm = (candidate: Candidate) => {
    if (votingActive) {
      setErrorMessage(
        'Data pasangan calon tidak dapat diubah selama voting berlangsung.'
      );
      return;
    }

    resetForm();

    setEditingId(candidate.id);

    setForm({
      nomor_urut: String(candidate.nomor_urut),
      nama_ketua: candidate.nama_ketua,
      nama_wakil: candidate.nama_wakil,
      visi: candidate.visi ?? '',
      misi: candidate.misi ?? '',
      foto_url: candidate.foto_url ?? '',
    });

    setPreviewUrl(candidate.foto_url ?? '');

    setMessage('');
    setErrorMessage('');
    setFormOpen(true);
  };

  // Memeriksa file foto yang dipilih.
  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setErrorMessage('');
    setMessage('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage('Format foto harus JPG, PNG, atau WebP.');

      setSelectedFile(null);
      setPreviewUrl(form.foto_url);
      setFileInputKey((previous) => previous + 1);
      return;
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      setErrorMessage(
        'Ukuran foto harus lebih dari 0 dan maksimal 5 MB.'
      );

      setSelectedFile(null);
      setPreviewUrl(form.foto_url);
      setFileInputKey((previous) => previous + 1);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Mengunggah foto pasangan calon.
  const uploadPhoto = async (token: string): Promise<string> => {
    if (!selectedFile) {
      return form.foto_url;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    const response = await fetch(
      '/api/admin/candidates/upload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || 'Gagal mengunggah foto pasangan calon.'
      );
    }

    if (!result.foto_url) {
      throw new Error(
        'Foto berhasil diproses, tetapi URL foto tidak ditemukan.'
      );
    }

    return result.foto_url;
  };

  // Menyimpan pasangan calon baru atau perubahan data.
  const handleSave = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (saving) return;

    if (votingActive) {
      setErrorMessage(
        'Data pasangan calon tidak dapat diubah selama voting berlangsung.'
      );
      return;
    }

    const nomorUrut = Number(form.nomor_urut);

    if (!Number.isInteger(nomorUrut) || nomorUrut < 1) {
      setErrorMessage(
        'Nomor urut harus berupa bilangan bulat minimal 1.'
      );
      return;
    }

    if (!form.nama_ketua.trim() || !form.nama_wakil.trim()) {
      setErrorMessage(
        'Nama ketua dan wakil ketua wajib diisi.'
      );
      return;
    }

    setSaving(true);
    setMessage('');
    setErrorMessage('');

    try {
      // Periksa status voting terbaru sebelum mengubah data.
      await loadVotingStatus();

      const token = await getToken();
      const fotoUrl = await uploadPhoto(token);

      const response = await fetch('/api/admin/candidates', {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          nomor_urut: nomorUrut,
          nama_ketua: form.nama_ketua.trim(),
          nama_wakil: form.nama_wakil.trim(),
          visi: form.visi,
          misi: form.misi,
          foto_url: fotoUrl || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Gagal menyimpan data pasangan calon.'
        );
      }

      setMessage(
        result.message || 'Data pasangan calon berhasil disimpan.'
      );

      setFormOpen(false);
      resetForm();

      await loadCandidates();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menyimpan data.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Menghapus pasangan calon.
  const handleDelete = async (candidate: Candidate) => {
    if (votingActive) {
      setErrorMessage(
        'Pasangan calon tidak dapat dihapus selama voting berlangsung.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Yakin ingin menghapus pasangan calon nomor ${candidate.nomor_urut} atas nama ${candidate.nama_ketua} dan ${candidate.nama_wakil}?\n\nPasangan calon yang sudah memiliki suara tidak dapat dihapus.`
    );

    if (!confirmed) return;

    setMessage('');
    setErrorMessage('');

    try {
      // Periksa status voting terbaru sebelum menghapus data.
      await loadVotingStatus();

      const token = await getToken();

      const response = await fetch('/api/admin/candidates', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: candidate.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Gagal menghapus pasangan calon.'
        );
      }

      setMessage(
        result.message || 'Pasangan calon berhasil dihapus.'
      );

      await loadCandidates();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menghapus data.'
      );
    }
  };

  return (
    <AdminLayout
      title="Pasangan Calon"
      subtitle="Kelola data kandidat pemilihan OSIS"
    >
      {/* Informasi status voting */}
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <strong>Perhatian:</strong> Data pasangan calon tidak dapat
          diubah selama voting berlangsung. Pasangan calon yang sudah
          memiliki suara tidak dapat dihapus agar riwayat pemilihan
          tetap terjaga.
        </p>

        <p className="mt-2 text-sm font-semibold text-amber-900">
          Status saat ini:{' '}
          {votingActive
            ? 'Voting sedang berlangsung atau status tidak tersedia'
            : 'Voting tidak berlangsung'}
        </p>
      </div>

      {/* Pesan berhasil */}
      {message && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {message}
        </div>
      )}

      {/* Pesan kesalahan */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {/* Header daftar pasangan calon */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Daftar Pasangan Calon
          </h2>

          <p className="text-sm text-muted-foreground">
            {candidates.length} pasangan calon terdaftar
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          disabled={votingActive}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Tambah Pasangan Calon
        </button>
      </div>

      {/* Formulir tambah dan edit */}
      {formOpen && (
        <form
          onSubmit={handleSave}
          className="mb-6 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card"
        >
          <h3 className="text-lg font-bold text-foreground">
            {editingId
              ? 'Edit Pasangan Calon'
              : 'Tambah Pasangan Calon'}
          </h3>

          <div>
            <label
              htmlFor="nomor_urut"
              className="mb-1 block text-sm font-semibold text-foreground"
            >
              Nomor Urut *
            </label>

            <input
              id="nomor_urut"
              type="number"
              min="1"
              step="1"
              required
              value={form.nomor_urut}
              onChange={(event) =>
                setForm({
                  ...form,
                  nomor_urut: event.target.value,
                })
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="nama_ketua"
                className="mb-1 block text-sm font-semibold text-foreground"
              >
                Nama Ketua *
              </label>

              <input
                id="nama_ketua"
                required
                maxLength={150}
                value={form.nama_ketua}
                onChange={(event) =>
                  setForm({
                    ...form,
                    nama_ketua: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="nama_wakil"
                className="mb-1 block text-sm font-semibold text-foreground"
              >
                Nama Wakil *
              </label>

              <input
                id="nama_wakil"
                required
                maxLength={150}
                value={form.nama_wakil}
                onChange={(event) =>
                  setForm({
                    ...form,
                    nama_wakil: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="visi"
              className="mb-1 block text-sm font-semibold text-foreground"
            >
              Visi
            </label>

            <textarea
              id="visi"
              rows={3}
              maxLength={5000}
              value={form.visi}
              onChange={(event) =>
                setForm({
                  ...form,
                  visi: event.target.value,
                })
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="misi"
              className="mb-1 block text-sm font-semibold text-foreground"
            >
              Misi
            </label>

            <textarea
              id="misi"
              rows={5}
              maxLength={10000}
              value={form.misi}
              onChange={(event) =>
                setForm({
                  ...form,
                  misi: event.target.value,
                })
              }
              placeholder="Tuliskan misi satu per baris."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
          </div>

          {/* Unggah foto */}
          <div>
            <label
              htmlFor="foto_file"
              className="mb-1 block text-sm font-semibold text-foreground"
            >
              Foto Pasangan Calon
            </label>

            <input
              key={fileInputKey}
              id="foto_file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />

            <p className="mt-1 text-xs text-muted-foreground">
              Format JPG, PNG, atau WebP. Ukuran maksimal 5 MB.
            </p>

            {selectedFile && (
              <p className="mt-2 text-xs text-muted-foreground">
                File dipilih: {selectedFile.name}
              </p>
            )}

            {previewUrl ? (
              <div className="mt-3">
                <p className="mb-2 text-sm font-semibold text-foreground">
                  Pratinjau Foto
                </p>

                <img
                  src={previewUrl}
                  alt="Pratinjau foto pasangan calon"
                  className="h-56 w-full max-w-md rounded-xl border border-border bg-muted object-cover"
                />

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl('');
                    setForm({
                      ...form,
                      foto_url: '',
                    });
                    setFileInputKey((previous) => previous + 1);
                  }}
                  className="mt-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Hapus Foto dari Formulir
                </button>
              </div>
            ) : (
              <div className="mt-3 flex h-32 w-full max-w-md items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
                Belum ada foto dipilih
              </div>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              {editingId
                ? 'Jika tidak memilih foto baru, foto sebelumnya tetap digunakan. Jika memilih foto baru, foto sebelumnya akan diganti.'
                : 'Pilih foto pasangan calon dari komputer kamu.'}
            </p>
          </div>

          {/* Tombol formulir */}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || votingActive}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? selectedFile
                  ? 'Mengunggah dan Menyimpan...'
                  : 'Menyimpan...'
                : editingId
                  ? 'Simpan Perubahan'
                  : 'Tambah Pasangan'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setFormOpen(false);
                resetForm();
                setErrorMessage('');
              }}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Daftar pasangan calon */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Memuat data pasangan calon...
        </div>
      ) : candidates.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="font-semibold text-foreground">
            Belum ada pasangan calon
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Tambahkan data pasangan calon untuk menampilkannya di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
            >
              {/* Header kartu */}
              <div className="bg-primary p-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-xl font-extrabold">
                      {String(candidate.nomor_urut).padStart(2, '0')}
                    </div>

                    <div>
                      <p className="text-sm font-bold">
                        Pasangan{' '}
                        {String(candidate.nomor_urut).padStart(2, '0')}
                      </p>

                      <p className="text-xs text-blue-200">
                        Tahun Angkatan 2026/2027
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-xs font-semibold">
                    {candidate.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>

              {/* Isi kartu */}
              <div className="p-4">
                {candidate.foto_url ? (
                  <img
                    src={candidate.foto_url}
                    alt={`Foto pasangan ${candidate.nomor_urut}`}
                    className="mb-4 h-48 w-full rounded-xl border border-border bg-muted object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="mb-4 flex h-48 w-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
                    Foto belum tersedia
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Ketua
                    </p>

                    <p className="font-bold text-foreground">
                      {candidate.nama_ketua}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Wakil Ketua
                    </p>

                    <p className="font-bold text-foreground">
                      {candidate.nama_wakil}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Visi
                    </p>

                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {candidate.visi || 'Visi belum diisi.'}
                    </p>
                  </div>

                  {/* Detail misi */}
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(
                          expandedId === candidate.id
                            ? null
                            : candidate.id
                        )
                      }
                      className="text-sm font-semibold text-accent hover:opacity-80"
                    >
                      {expandedId === candidate.id
                        ? 'Sembunyikan Misi ▲'
                        : 'Lihat Misi ▼'}
                    </button>

                    {expandedId === candidate.id && (
                      <div className="mt-2 whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm leading-relaxed text-foreground">
                        {candidate.misi || 'Misi belum diisi.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tombol edit dan hapus */}
              <div className="flex gap-2 px-4 pb-4">
                <button
                  type="button"
                  onClick={() => openEditForm(candidate)}
                  disabled={votingActive}
                  className="flex flex-1 items-center justify-center rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => void handleDelete(candidate)}
                  disabled={votingActive}
                  className="flex flex-1 items-center justify-center rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}