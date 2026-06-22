'use client';

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="group absolute left-8 flex items-center gap-1 font-display text-sm transition-opacity hover:opacity-60"
      style={{ color: 'var(--fg)' }}
    >
      ←
      <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-[3rem]">
        Back
      </span>
    </button>
  );
}
