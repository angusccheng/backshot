'use client';

import { createContext, useContext, useState } from 'react';

const FlashlightContext = createContext<{
  active: boolean;
  setActive: (v: boolean) => void;
}>({ active: false, setActive: () => {} });

export function FlashlightProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  return (
    <FlashlightContext.Provider value={{ active, setActive }}>
      {children}
    </FlashlightContext.Provider>
  );
}

export function useFlashlight() {
  return useContext(FlashlightContext);
}
