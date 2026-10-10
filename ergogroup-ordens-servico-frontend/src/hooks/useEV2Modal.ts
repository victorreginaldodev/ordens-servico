import { useState } from 'react';

const STORAGE_KEY = 'ergogroup-ev2-acknowledged';

export function useEV2Modal() {
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
    setOpen(false);
  };

  // Reabre pelo item "Novidades" da sidebar, mesmo depois de dispensado.
  const show = () => setOpen(true);

  return { open, dismiss, show };
}
