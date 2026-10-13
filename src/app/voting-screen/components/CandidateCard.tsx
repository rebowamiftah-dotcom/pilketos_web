'use client';

import React, { useState } from 'react';
import AppImage from '@/components/ui/AppImage';
import type { Candidate } from '@/lib/mockData';

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: () => void;
}

export default function CandidateCard({
  candidate,
  isSelected,
  onSelect,
}: CandidateCardProps) {
  // State ini hanya berlaku untuk card kandidat yang sedang ditampilkan.
  const [expanded, setExpanded] = useState(false);

  // Mendukung misi berbentuk array maupun string.
  const missions: string[] = Array.isArray(candidate.misi)
    ? candidate.misi.map((item: unknown) => String(item).trim()).filter(Boolean)
    : typeof candidate.misi === 'string'
      ? candidate.misi
          .split(/\r?\n/)
          .map((item: string) => item.trim())
          .filter(Boolean)
      : [];

  // Menghilangkan nomor atau bullet jika misi dari admin sudah memilikinya.
  const cleanMission = (mission: string) =>
    mission.replace(/^\s*(?:\d+[\s.)-]+\s*|[-•]\s*)/, '').trim();

  // Satu poster pasangan calon, mengikuti data dari admin.
  const candidateImage =
    candidate.foto_url ||
    candidate.foto_ketua ||
    '/assets/images/no_image.png';

  const nomorPasangan = String(candidate.nomor_urut).padStart(2, '0');

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 bg-card shadow-card transition-all duration-200 ${
        isSelected
          ? 'candidate-card-selected border-accent'
          : 'border-border hover:border-accent/40 hover:shadow-card-hover'
      }`}
      onClick={onSelect}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Nomor urut dan informasi pasangan */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white ${
            isSelected ? 'bg-accent' : 'bg-primary'
          }`}
        >
          {nomorPasangan}
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-extrabold leading-tight text-foreground">
            Pasangan {nomorPasangan}
          </span>

          <span className="mt-1 text-xs font-medium text-muted-foreground">
            Tahun Angkatan 2026/2027
          </span>
        </div>
      </div>

      {/* Indikator pilihan */}
      {isSelected && (
        <div className="fade-in absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-accent">
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      {/* Poster pasangan calon */}
      <div className="px-5 pb-3 pt-16">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted">
          <AppImage
            src={candidateImage}
            alt={`Poster pasangan calon ${nomorPasangan}: ${candidate.nama_ketua} dan ${candidate.nama_wakil}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="h-full w-full object-cover"
            unoptimized
            fallbackSrc="/assets/images/no_image.png"
          />
        </div>
      </div>

      {/* Nama ketua dan wakil */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 px-5 pb-5 text-center">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ketua
          </p>

          <p className="break-words text-sm font-bold leading-relaxed text-foreground">
            {candidate.nama_ketua}
          </p>
        </div>

        <div className="mt-5 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Wakil
          </p>

          <p className="break-words text-sm font-bold leading-relaxed text-foreground">
            {candidate.nama_wakil}
          </p>
        </div>
      </div>

      {/* Visi */}
      <div className="px-5 pb-4">
        <div
          className={`rounded-xl p-4 ${
            isSelected ? 'bg-accent/10' : 'bg-muted/50'
          }`}
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Visi
          </p>

          <p className="whitespace-pre-line break-words text-sm leading-6 text-foreground">
            {candidate.visi || 'Visi belum tersedia.'}
          </p>
        </div>
      </div>

      {/* Tombol tampilkan misi */}
      <div className="px-5 pb-5">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((previous) => !previous);
          }}
          className="flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-accent transition-colors hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>

          {expanded ? 'Sembunyikan Misi' : 'Lihat Misi'}
        </button>

        {/* Misi hanya terbuka pada card yang diklik */}
        {expanded && (
          <div className="fade-in mt-3">
            {missions.length > 0 ? (
              <ol className="space-y-3">
                {missions.map((mission, index) => (
                  <li
                    key={`${candidate.id}-mission-${index}`}
                    className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                      {index + 1}
                    </span>

                    <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                      {cleanMission(mission) || mission}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                Misi belum tersedia.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tombol pilih pasangan */}
      <div className="mt-auto px-5 pb-5">
        <div
          className={`w-full rounded-xl py-3 text-center text-sm font-bold transition-all ${
            isSelected
              ? 'bg-accent text-white'
              : 'bg-muted text-muted-foreground group-hover:bg-accent/10'
          }`}
        >
          {isSelected ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>

              Dipilih
            </span>
          ) : (
            'Pilih Pasangan Ini'
          )}
        </div>
      </div>
    </div>
  );
}