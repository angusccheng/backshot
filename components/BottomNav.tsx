'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, CalendarDays, ImageIcon, PenLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';

const ITEMS = [
  { label: 'Home',     icon: PenLine,      href: '/' },
  { label: 'Shelf',    icon: BookOpen,     href: '/shelf' },
  { label: 'Calendar', icon: CalendarDays, href: '/calendar' },
  { label: 'Photos',   icon: ImageIcon,    href: '/photos' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeIndex = (() => {
    if (pathname === '/photos') return 3;
    if (pathname === '/calendar') return 2;
    if (pathname.startsWith('/shelf')) return 1;
    if (pathname === '/') return 0;
    return -1;
  })();

  return (
    <nav
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-2 rounded-2xl"
      style={{
        background: isDark ? 'rgba(18,18,18,0.92)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: isDark
          ? '0 8px 40px rgba(0,0,0,0.5)'
          : '0 8px 40px rgba(0,0,0,0.12)',
      }}
    >
      {ITEMS.map((item, i) => {
        const isActive = activeIndex === i;
        return (
          <motion.button
            key={item.href}
            layout
            onClick={() => router.push(item.href)}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="relative flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors duration-200"
            style={{
              background: isActive
                ? isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                : 'transparent',
              color: isActive
                ? isDark ? '#ffffff' : '#000000'
                : isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)',
            }}
            aria-label={item.label}
          >
            <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
            <AnimatePresence>
              {(isActive || hoveredIndex === i) && (
                <motion.span
                  key="label"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden whitespace-nowrap font-display font-medium text-sm"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </nav>
  );
}
