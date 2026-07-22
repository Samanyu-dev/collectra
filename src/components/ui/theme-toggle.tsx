'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { THEME_STORAGE_KEY } from '@/lib/theme';

export function useTheme() {
  const [isLight, setIsLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains('light'));
    setMounted(true);
  }, []);

  function setTheme(light: boolean) {
    setIsLight(light);
    document.documentElement.classList.toggle('light', light);
    localStorage.setItem(THEME_STORAGE_KEY, light ? 'light' : 'dark');
  }

  return { isLight, mounted, setTheme };
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { isLight, mounted, setTheme } = useTheme();

  if (!mounted) {
    return <div className={`w-9 h-9 ${className}`} aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(!isLight)}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className={`relative w-9 h-9 flex items-center justify-center rounded-full bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 text-foreground/70 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${className}`}
    >
      {isLight ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
    </button>
  );
}
