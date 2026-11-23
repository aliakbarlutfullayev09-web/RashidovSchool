import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children, initialTheme = 'dark' }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('rb_theme') || initialTheme || 'dark';
  });

  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen to OS system color-scheme changes if theme is 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemIsDark(e.matches);
    
    if (media.addEventListener) {
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    } else if (media.addListener) {
      media.addListener(handler);
      return () => media.removeListener(handler);
    }
  }, []);

  const resolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return theme === 'light' ? 'light' : 'dark';
  }, [theme, systemIsDark]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('rb_theme', newTheme);
  };

  // Live DOM & Telegram theme application
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', resolvedTheme);
    body.setAttribute('data-theme', resolvedTheme);

    if (resolvedTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      body.classList.remove('dark');
      body.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      body.classList.remove('light');
      body.classList.add('dark');
    }

    // Update Telegram WebApp colors
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        const bgHex = resolvedTheme === 'light' ? '#F2F2F7' : '#000000';
        if (typeof tg.setHeaderColor === 'function') {
          tg.setHeaderColor(bgHex);
        }
        if (typeof tg.setBackgroundColor === 'function') {
          tg.setBackgroundColor(bgHex);
        }
      } catch (e) {
        console.warn('Telegram theme color sync error:', e);
      }
    }
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
