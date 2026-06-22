'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';

interface Filter { month: string; day: string; year: string; }
interface Props {
  onChange: (f: Filter) => void;
  /** If provided, renders an action button to the right of the search */
  action?: React.ReactNode;
}

export function DateSearch({ onChange, action }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const moRef = useRef<HTMLInputElement>(null);
  const dyRef = useRef<HTMLInputElement>(null);
  const yrRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((m: string, d: string, y: string) => {
    setMonth(m); setDay(d); setYear(y);
    onChange({ month: m, day: d, year: y });
  }, [onChange]);

  const clear = useCallback(() => { update('', '', ''); setOpen(false); }, [update]);
  const hasValue = !!(month || day || year);

  // Collapse on outside click (when has value, keep open)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!hasValue) setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, hasValue]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>, field: 'mo' | 'dy' | 'yr') => {
    const refs = { mo: moRef, dy: dyRef, yr: yrRef };
    const order = ['mo', 'dy', 'yr'] as const;
    const idx = order.indexOf(field);
    if (e.key === 'ArrowRight' && idx < 2) { e.preventDefault(); refs[order[idx + 1]].current?.focus(); refs[order[idx + 1]].current?.select(); }
    if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); refs[order[idx - 1]].current?.focus(); refs[order[idx - 1]].current?.select(); }
    if (e.key === 'Backspace' && e.currentTarget.value === '' && idx > 0) {
      e.preventDefault();
      refs[order[idx - 1]].current?.focus();
      refs[order[idx - 1]].current?.select();
    }
    if (e.key === 'Escape') clear();
  };

  const expand = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    setOpen(true);
    setTimeout(() => moRef.current?.focus(), 50);
  };

  const handleMouseLeave = () => {
    if (hasValue) return; // keep open while values are typed
    leaveTimerRef.current = setTimeout(() => setOpen(false), 120);
  };

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
  };

  useEffect(() => () => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); }, []);

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        layout
        className="flex items-center overflow-hidden"
        style={{
          border: '1px solid var(--border)',
          background: 'var(--bg-alt)',
          height: 34,
          borderRadius: 10,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        {/* Magnifying glass */}
        <button
          onMouseEnter={expand}
          onClick={expand}
          className="flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-60"
          style={{ width: 34, height: 34, color: 'var(--fg-secondary)' }}
        >
          <Search size={14} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              key="inputs"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="flex items-center gap-1 overflow-hidden pr-2"
            >
              <input ref={moRef} type="text" placeholder="MM" maxLength={2} value={month}
                onChange={e => { const v = e.target.value.replace(/\D/g, ''); update(v, day, year); if (v.length === 2) { dyRef.current?.focus(); dyRef.current?.select(); } }}
                onKeyDown={e => handleKey(e, 'mo')}
                className="tabular-nums border-none outline-none select-none content-box caret-transparent rounded-sm w-8 text-center bg-transparent focus:bg-foreground/10 py-1"
                style={{ fontSize: 13, color: 'var(--fg)' }}
              />
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--fg-tertiary)' }}>/</span>
              <input ref={dyRef} type="text" placeholder="DD" maxLength={2} value={day}
                onChange={e => { const v = e.target.value.replace(/\D/g, ''); update(month, v, year); if (v.length === 2) { yrRef.current?.focus(); yrRef.current?.select(); } }}
                onKeyDown={e => handleKey(e, 'dy')}
                className="tabular-nums border-none outline-none select-none content-box caret-transparent rounded-sm w-8 text-center bg-transparent focus:bg-foreground/10 py-1"
                style={{ fontSize: 13, color: 'var(--fg)' }}
              />
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--fg-tertiary)' }}>/</span>
              <input ref={yrRef} type="text" placeholder="YYYY" maxLength={4} value={year}
                onChange={e => update(month, day, e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => handleKey(e, 'yr')}
                className="tabular-nums border-none outline-none select-none content-box caret-transparent rounded-sm w-12 text-center bg-transparent focus:bg-foreground/10 py-1"
                style={{ fontSize: 13, color: 'var(--fg)' }}
              />
              {hasValue && (
                <button onClick={clear} className="flex-shrink-0 ml-1 transition-opacity hover:opacity-60" style={{ color: 'var(--fg-tertiary)' }}>
                  <X size={12} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action slot — animates with layout as search expands */}
      {action && (
        <motion.div layout transition={{ type: 'spring', stiffness: 400, damping: 32 }}>
          {action}
        </motion.div>
      )}
    </div>
  );
}
