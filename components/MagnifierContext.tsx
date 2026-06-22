'use client';

import { createContext, useContext, useState } from 'react';

const MagnifierContext = createContext<{
  active: boolean;
  setActive: (v: boolean) => void;
}>({ active: false, setActive: () => {} });

export function MagnifierProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  return (
    <MagnifierContext.Provider value={{ active, setActive }}>
      {children}
    </MagnifierContext.Provider>
  );
}

export function useMagnifier() {
  return useContext(MagnifierContext);
}
