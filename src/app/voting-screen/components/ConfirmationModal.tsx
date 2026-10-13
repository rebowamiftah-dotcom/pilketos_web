'use client';

import React from 'react';
import type { Candidate } from '@/lib/mockData';

interface ConfirmationModalProps {
  candidate: Candidate;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  candidate,
  isSubmitting,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-card rounded-2xl shadow-modal max-w-md w-full modal-enter">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 id="modal-title" className="font-700 text-foreground text-lg">
                Konfirmasi Pilihan
              </h2>
              <p className="text-muted-foreground text-xs">Pastikan pilihan Anda sudah benar</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-foreground text-sm mb-4">
            Apakah Anda yakin ingin memilih:
          </p>

          {/* Selected candidate summary */}
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center font-800 text-white text-lg flex-shrink-0">
                {String(candidate.nomor_urut).padStart(2, '0')}
              </div>
              <div>
                <p className="font-700 text-foreground text-base">
                  Pasangan {String(candidate.nomor_urut).padStart(2, '0')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {candidate.nama_ketua} &amp; {candidate.nama_wakil}
                </p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-amber-700 text-xs font-500 leading-relaxed">
              <strong>Perhatian:</strong> Pilihan yang sudah dikonfirmasi tidak dapat diubah.
              Token Anda akan ditandai sebagai sudah digunakan.
            </p>
          </div>

          {/* Processing state */}
          {isSubmitting && (
            <div className="mt-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-accent/10 border border-accent/20 fade-in">
              <svg className="w-4 h-4 animate-spin text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-accent text-sm font-600">Memproses suara...</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border border-border text-foreground font-600 text-sm hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Kembali
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl btn-primary font-700 text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Ya, Saya Yakin
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}