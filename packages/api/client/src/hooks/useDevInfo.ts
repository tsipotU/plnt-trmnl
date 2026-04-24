import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'plant-trmnl:show-dev-info';
const EVENT_NAME = 'plant-trmnl:dev-info-changed';

function readFlag(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * localStorage-backed hook for the "Show developer info" toggle.
 *
 * Flag is off by default. The setter updates localStorage and broadcasts a
 * `plant-trmnl:dev-info-changed` CustomEvent so every mounted hook instance
 * (e.g. PlantDetail + Settings open in the same tab) stays in sync without
 * relying on React context.
 */
export function useDevInfo(): [boolean, (value: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => readFlag());

  useEffect(() => {
    function handleChange() {
      setEnabled(readFlag());
    }
    window.addEventListener(EVENT_NAME, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(EVENT_NAME, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  const setFlag = useCallback((value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    } catch {
      // localStorage not available — best effort
    }
    setEnabled(value);
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    } catch {
      // no-op
    }
  }, []);

  return [enabled, setFlag];
}

export const DEV_INFO_STORAGE_KEY = STORAGE_KEY;
