'use client';

import React, { useEffect, useRef, useState } from 'react';

const features = [
  {
    id: 'feature-pkl',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.7}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    title: 'Khusus Siswa PKL',
    description:
      'Hanya siswa yang memenuhi persyaratan pemilihan yang berhak menggunakan hak suara.',
  },
  {
    id: 'feature-once',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.7}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    title: 'Satu Suara Per Pemilih',
    description:
      'Sistem mencegah pemilihan ganda. Setelah suara dikirim dan dikonfirmasi, pemilih tidak dapat memberikan suara kembali.',
  },
  {
    id: 'feature-secure',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.7}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
    title: 'Proses Aman & Tercatat',
    description:
      'Setiap suara dicatat dalam sistem dengan tetap menjaga kerahasiaan pilihan pemilih.',
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    // Hormati preferensi pengguna yang mengurangi animasi.
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    if (reducedMotion.matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.15,
      },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  const revealClass = isVisible
    ? 'translate-y-0 opacity-100'
    : 'translate-y-8 opacity-0';

  return (
    <section
      ref={sectionRef}
      className="bg-background py-16 sm:py-24"
    >
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        {/* Judul */}
        <div
          className={`mb-12 text-center transition-[opacity,transform] duration-700 ease-out ${revealClass}`}
        >
          <h2 className="mb-4 text-3xl font-700 text-foreground sm:text-4xl">
            Sistem Voting yang Terpercaya
          </h2>

          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
            PILKETOS DIGITAL dirancang untuk memastikan setiap suara valid,
            aman, dan dihitung dengan benar.
          </p>
        </div>

        {/* Cards */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <article
              key={feature.id}
              className={`rounded-2xl border border-border bg-card p-7 transition-[opacity,transform,border-color] duration-700 ease-out hover:border-slate-300 ${revealClass}`}
              style={{
                transitionDelay: isVisible
                  ? `${150 + index * 180}ms`
                  : '0ms',
              }}
            >
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                {feature.icon}
              </div>

              <h3 className="mb-3 text-base font-700 text-foreground">
                {feature.title}
              </h3>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}