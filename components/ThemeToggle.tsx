'use client';
import { useTheme } from '@/components/ThemeProvider';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useFlashlight } from '@/components/FlashlightContext';
import { useMagnifier } from '@/components/MagnifierContext';

function SolarSwitch({ isDark }: { isDark: boolean }) {
  const duration = 0.7;
  const moonVariants = { checked: { scale: 1 }, unchecked: { scale: 0 } };
  const sunVariants  = { checked: { scale: 0 }, unchecked: { scale: 1 } };
  const scaleMoon = useMotionValue(isDark ? 1 : 0);
  const scaleSun  = useMotionValue(isDark ? 0 : 1);
  const pathLengthMoon = useTransform(scaleMoon, [0.6, 1], [0, 1]);
  const pathLengthSun  = useTransform(scaleSun,  [0.6, 1], [0, 1]);

  return (
    <motion.div animate={isDark ? 'checked' : 'unchecked'}>
      <motion.svg width="15" height="15" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        {[
          'M12.4058 17.7625C15.1672 17.7625 17.4058 15.5239 17.4058 12.7625C17.4058 10.0011 15.1672 7.76251 12.4058 7.76251C9.64434 7.76251 7.40576 10.0011 7.40576 12.7625C7.40576 15.5239 9.64434 17.7625 12.4058 17.7625Z',
          'M12.4058 1.76251V3.76251','M12.4058 21.7625V23.7625',
          'M4.62598 4.98248L6.04598 6.40248','M18.7656 19.1225L20.1856 20.5425',
          'M1.40576 12.7625H3.40576','M21.4058 12.7625H23.4058',
          'M4.62598 20.5425L6.04598 19.1225','M18.7656 6.40248L20.1856 4.98248',
        ].map((d, i) => (
          <motion.path key={i} d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            variants={sunVariants} custom={isDark} transition={{ duration }}
            style={{ pathLength: pathLengthSun, scale: scaleSun }} />
        ))}
        <motion.path
          d="M21.1918 13.2013C21.0345 14.9035 20.3957 16.5257 19.35 17.8781C18.3044 19.2305 16.8953 20.2571 15.2875 20.8379C13.6797 21.4186 11.9398 21.5294 10.2713 21.1574C8.60281 20.7854 7.07479 19.9459 5.86602 18.7371C4.65725 17.5283 3.81774 16.0003 3.4457 14.3318C3.07367 12.6633 3.18451 10.9234 3.76526 9.31561C4.346 7.70783 5.37263 6.29868 6.72501 5.25307C8.07739 4.20746 9.69959 3.56862 11.4018 3.41132C10.4052 4.75958 9.92564 6.42077 10.0503 8.09273C10.175 9.76469 10.8957 11.3364 12.0812 12.5219C13.2667 13.7075 14.8384 14.4281 16.5104 14.5528C18.1823 14.6775 19.8435 14.1979 21.1918 13.2013Z"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          transition={{ duration }} variants={moonVariants} custom={isDark}
          style={{ pathLength: pathLengthMoon, scale: scaleMoon }} />
      </motion.svg>
    </motion.div>
  );
}

function FlashlightIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9.5" y="11" width="5" height="9" rx="1.2" />
      <path d="M8.5 11 L9 8.5 L15 8.5 L15.5 11 Z" />
      <circle cx="12" cy="15" r="0.9" fill="currentColor" stroke="none" />
      <line x1="12" y1="7" x2="12" y2="5" />
      <line x1="9.8" y1="7.6" x2="8.4" y2="6.2" />
      <line x1="14.2" y1="7.6" x2="15.6" y2="6.2" />
    </svg>
  );
}

function MagnifierIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="6.5" />
      <line x1="15" y1="15" x2="20" y2="20" />
    </svg>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { active: flashActive, setActive: setFlashActive } = useFlashlight();
  const { active: magActive, setActive: setMagActive } = useMagnifier();
  const magOn = magActive;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className={cn('absolute right-8', className)} style={{ width: 36, height: 36, flexShrink: 0 }} />;

  const isDark = theme === 'dark';

  // Turn off flashlight when switching to light
  const handleThemeToggle = () => {
    if (isDark) setFlashActive(false);
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <div className={cn('absolute right-8 flex items-center gap-3', className)}>
      {isDark && (
        <button
          onClick={() => setFlashActive(!flashActive)}
          className="transition-opacity hover:opacity-60 outline-none"
          style={{ color: flashActive ? '#FFD166' : 'var(--fg)' }}
          title="Flashlight"
        >
          <FlashlightIcon />
        </button>
      )}
      {!isDark && (
        <button
          onClick={() => setMagActive(!magActive)}
          className={`outline-none transition-opacity ${magOn ? '' : 'hover:opacity-60'}`}
          style={{ color: magOn ? '#D97706' : 'var(--fg)' }}
          title="Magnifier"
        >
          <MagnifierIcon />
        </button>
      )}
      <button
        onClick={handleThemeToggle}
        className="transition-opacity hover:opacity-60 outline-none"
        style={{ color: 'var(--fg)' }}
      >
        <SolarSwitch isDark={isDark} />
      </button>
    </div>
  );
}
