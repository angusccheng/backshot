'use client';

import { useEffect, useState } from 'react';

const FULL = 'back[shot]';
const SPEED = 130; // ms per char

export function LogoTyping() {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let i = 0;
    const tick = () => {
      i++;
      setDisplayed(FULL.slice(0, i));
      if (i < FULL.length) setTimeout(tick, SPEED);
    };
    setTimeout(tick, SPEED);
  }, []);

  // Split into "back" and "[shot]" for styling
  const base = displayed.slice(0, 4);           // "back"
  const bracket = displayed.slice(4);           // "[shot]" partial

  return (
    <span className="font-display font-semibold text-sm tracking-tight select-none" style={{ color: 'var(--fg)' }}>
      {base}
      {bracket && (
        <span style={{
          background: 'var(--fg)',
          color: 'var(--bg)',
          borderRadius: 3,
          padding: '1px 3px',
          marginLeft: 1,
        }}>
          {bracket}
        </span>
      )}
    </span>
  );
}
