"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { supabaseAuth } from "@/lib/supabaseAuth";

type Candidate = {
  id: string;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  digital_vote_count: number;
  manual_vote_count: number;
  vote_count: number;
};

type HistoryItem = {
  id: string;
  candidate_id: string;
  action: "add" | "subtract";
  vote_count: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type ApiResponse = {
  candidates?: Candidate[];
  history?: HistoryItem[];
  error?: string;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function ManualVotesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actions, setActions] = useState<Record<string, "add" | "subtract">>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseAuth.auth.getSession();

      if (sessionError || !session?.access_token) {
        setMessage("Sesi admin tidak ditemukan. Silakan login kembali.");
        setMessageType("error");
        return;
      }

      const response = await fetch("/api/admin/manual-votes", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil data suara.");
      }

      setCandidates(data.candidates ?? []);
      setHistory(data.history ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengambil data."
      );
      setMessageType("error");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(true);

    const interval = window.setInterval(() => {
      void loadData();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadData]);

  const totalDigital = candidates.reduce(
    (sum, candidate) => sum + candidate.digital_vote_count,
    0
  );

  const totalManual = candidates.reduce(
    (sum, candidate) => sum + candidate.manual_vote_count,
    0
  );

  async function saveVotes(candidate: Candidate) {
    const amountText = inputs[candidate.id] ?? "";
    const amount = Number(amountText);
    const action = actions[candidate.id] ?? "add";
    const note = notes[candidate.id]?.trim() ?? "";

    if (
      !amountText.trim() ||
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      setMessage("Masukkan jumlah suara berupa bilangan bulat positif.");
      setMessageType("error");
      return;
    }

    if (action === "subtract" && amount > candidate.manual_vote_count) {
      setMessage(
        `Pengurangan melebihi suara manual yang tersedia untuk Paslon ${candidate.nomor_urut}.`
      );
      setMessageType("error");
      return;
    }

    if (note.length > 500) {
      setMessage("Catatan maksimal 500 karakter.");
      setMessageType("error");
      return;
    }

    setSavingId(candidate.id);
    setMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseAuth.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Sesi admin berakhir. Silakan login kembali.");
      }

      const response = await fetch("/api/admin/manual-votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          candidate_id: candidate.id,
          action,
          vote_count: amount,
          notes: note,
        }),
      });

      const data: { success?: boolean; message?: string; error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan perubahan suara.");
      }

      setInputs((previous) => ({
        ...previous,
        [candidate.id]: "",
      }));

      setNotes((previous) => ({
        ...previous,
        [candidate.id]: "",
      }));

      setMessage(
        data.message ||
          (action === "add"
            ? "Suara manual berhasil ditambahkan."
            : "Suara manual berhasil dikurangi.")
      );
      setMessageType("success");

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan suara."
      );
      setMessageType("error");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminLayout title="Penghitungan Suara Manual">
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px] space-y-7">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <span>Admin</span>
                <span>/</span>
                <span className="text-blue-700">
                  Penghitungan Manual
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Penghitung Suara Manual
              </h1>

              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                Kelola suara fisik dengan pencatatan perubahan di database.
              </p>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              Terhubung ke Database
            </div>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl">
                ℹ️
              </div>

              <div>
                <h2 className="font-bold text-blue-950">
                  Panel Penghitungan Suara Manual
                </h2>
                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Pastikan hasil surat suara fisik sudah diverifikasi.
                  Pengurangan hanya berlaku pada suara manual, bukan suara
                  digital. Setiap perubahan dicatat dalam riwayat.
                </p>
              </div>
            </div>
          </section>

          {message && (
            <div
              role="status"
              className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                messageType === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {message}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              title="Total Suara Manual"
              value={formatNumber(totalManual)}
              description="Akumulasi suara fisik"
              icon="🗳️"
              color="amber"
            />

            <SummaryCard
              title="Total Suara Digital"
              value={formatNumber(totalDigital)}
              description="Perolehan suara digital"
              icon="💻"
              color="blue"
            />

            <SummaryCard
              title="Total Seluruh Suara"
              value={formatNumber(totalManual + totalDigital)}
              description="Manual + digital"
              icon="📊"
              color="emerald"
            />
          </section>

          <section className="space-y-5">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Input Suara Manual Kandidat
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tambah atau koreksi jumlah suara manual setiap pasangan calon.
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                Memuat data kandidat dari database...
              </div>
            ) : candidates.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
                Tidak ada kandidat aktif yang ditemukan.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                {candidates.map((candidate, index) => {
                  const action = actions[candidate.id] ?? "add";
                  const color =
                    index % 3 === 0
                      ? "bg-amber-400"
                      : index % 3 === 1
                        ? "bg-slate-500"
                        : "bg-orange-500";

                  const total = candidate.vote_count;
                  const totalAll = totalDigital + totalManual;
                  const percentage =
                    totalAll > 0 ? (total / totalAll) * 100 : 0;

                  return (
                    <article
                      key={candidate.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg"
                    >
                      <div className={`h-2 ${color}`} />

                      <div className="space-y-5 p-5 sm:p-6">
                        <div className="flex items-center justify-between">
                          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-extrabold tracking-wider text-slate-600">
                            PASLON {candidate.nomor_urut}
                          </span>

                          <span className="text-xs font-medium text-slate-400">
                            Nomor urut {candidate.nomor_urut}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-xl font-extrabold text-slate-900">
                            {candidate.nama_ketua}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Wakil: {candidate.nama_wakil}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-blue-50 p-4">
                            <p className="text-xs font-semibold text-blue-600">
                              Suara Digital
                            </p>
                            <p className="mt-2 text-2xl font-extrabold text-blue-950">
                              {formatNumber(candidate.digital_vote_count)}
                            </p>
                          </div>

                          <div className="rounded-xl bg-amber-50 p-4">
                            <p className="text-xs font-semibold text-amber-700">
                              Suara Manual
                            </p>
                            <p className="mt-2 text-2xl font-extrabold text-amber-950">
                              {formatNumber(candidate.manual_vote_count)}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-500">
                              Total suara
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              {percentage.toFixed(1)}%
                            </p>
                          </div>

                          <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                            {formatNumber(total)}
                          </p>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label
                              htmlFor={`action-${candidate.id}`}
                              className="mb-2 block text-sm font-bold text-slate-700"
                            >
                              Tindakan
                            </label>

                            <select
                              id={`action-${candidate.id}`}
                              value={action}
                              onChange={(event) => {
                                setActions((previous) => ({
                                  ...previous,
                                  [candidate.id]: event.target.value as
                                    | "add"
                                    | "subtract",
                                }));
                                setMessage("");
                              }}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            >
                              <option value="add">Tambah suara manual</option>
                              <option value="subtract">
                                Kurangi suara manual
                              </option>
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={`votes-${candidate.id}`}
                              className="mb-2 block text-sm font-bold text-slate-700"
                            >
                              Jumlah suara
                            </label>

                            <input
                              id={`votes-${candidate.id}`}
                              type="number"
                              min="1"
                              step="1"
                              inputMode="numeric"
                              placeholder="Contoh: 25"
                              value={inputs[candidate.id] ?? ""}
                              onChange={(event) => {
                                setInputs((previous) => ({
                                  ...previous,
                                  [candidate.id]: event.target.value,
                                }));
                                setMessage("");
                              }}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`notes-${candidate.id}`}
                              className="mb-2 block text-sm font-bold text-slate-700"
                            >
                              Catatan perubahan (opsional)
                            </label>

                            <textarea
                              id={`notes-${candidate.id}`}
                              maxLength={500}
                              rows={2}
                              placeholder="Contoh: Koreksi hasil verifikasi..."
                              value={notes[candidate.id] ?? ""}
                              onChange={(event) =>
                                setNotes((previous) => ({
                                  ...previous,
                                  [candidate.id]: event.target.value,
                                }))
                              }
                              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={savingId !== null}
                            onClick={() => void saveVotes(candidate)}
                            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-bold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
                              action === "add"
                                ? "bg-blue-700 hover:bg-blue-800"
                                : "bg-red-600 hover:bg-red-700"
                            }`}
                          >
                            {savingId === candidate.id
                              ? "Menyimpan..."
                              : action === "add"
                                ? "＋ Simpan Penambahan"
                                : "− Simpan Pengurangan"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Riwayat Perubahan Suara Manual
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Riwayat ini diambil dari database, bukan data contoh.
                </p>
              </div>

              <span className="w-fit rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                {history.length} aktivitas terbaru
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-bold">Waktu</th>
                    <th className="px-6 py-4 font-bold">Pasangan Calon</th>
                    <th className="px-6 py-4 font-bold">Tindakan</th>
                    <th className="px-6 py-4 font-bold">Jumlah</th>
                    <th className="px-6 py-4 font-bold">Catatan</th>
                    <th className="px-6 py-4 font-bold">ID Admin</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => {
                    const candidate = candidates.find(
                      (entry) => entry.id === item.candidate_id
                    );

                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                          {formatDate(item.created_at)}
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {candidate
                            ? `Paslon ${candidate.nomor_urut} — ${candidate.nama_ketua}`
                            : "Kandidat"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                              item.action === "add"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {item.action === "add" ? "Penambahan" : "Pengurangan"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 font-extrabold">
                          <span
                            className={
                              item.action === "add"
                                ? "text-emerald-700"
                                : "text-red-700"
                            }
                          >
                            {item.action === "add" ? "+" : "−"}
                            {formatNumber(item.vote_count)}
                          </span>
                        </td>

                        <td className="max-w-[240px] px-6 py-4 text-slate-600">
                          {item.notes || "—"}
                        </td>

                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {item.created_by
                            ? `${item.created_by.slice(0, 8)}...`
                            : "Tidak tersedia"}
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && history.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        Belum ada riwayat perubahan suara manual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-6">
              Pengurangan hanya mengubah suara manual. Riwayat perubahan tetap
              disimpan untuk keperluan audit.
            </div>
          </section>

          <footer className="pb-3 text-center text-xs text-slate-400">
            PILKETOS • SMK Teratai Putih Global 4 Bekasi
          </footer>
        </div>
      </main>
    </AdminLayout>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  color,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
  color: "amber" | "blue" | "emerald";
}) {
  const styles = {
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-400">{description}</p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ring-1 ${styles[color]}`}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}