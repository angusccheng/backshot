'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { OriginButton } from '@/components/ui/origin-button';

export function WriteButton() {
  const [writtenToday, setWrittenToday] = useState<boolean | null>(null);

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const localDate = `${y}-${m}-${d}`;
    fetch(`/api/daylists?date=${localDate}`)
      .then(r => r.json())
      .then(data => setWrittenToday(data?.exists ?? false))
      .catch(() => setWrittenToday(false));
  }, []);

  if (writtenToday === null) return null;

  return writtenToday ? (
    <p className="font-display text-base" style={{ color: 'var(--fg-tertiary)', letterSpacing: '-0.01em' }}>
      you&apos;ve already written today. come back tomorrow.
    </p>
  ) : (
    <Link href="/write">
      <OriginButton>Write today&apos;s entry</OriginButton>
    </Link>
  );
}
