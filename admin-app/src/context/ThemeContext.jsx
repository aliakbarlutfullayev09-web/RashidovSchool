import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children, initialTheme = 'dark' }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('rb_admin_theme') || initialTheme || 'dark';
    } catch {
      return initialTheme || 'dark';
    }
  });

  const setTheme = (nextTheme) => {
    const resolved = nextTheme === 'light' ? 'light' : 'dark';
    setThemeState(resolved);
    try {
      localStorage.setItem('rb_admin_theme', resolved);
    } catch {}
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', theme);
    body.setAttribute('data-theme', theme);

    if (theme === 'light') {
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

    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        const bgHex = theme === 'light' ? '#F2F2F7' : '#000000';
        tg.setHeaderColor?.(bgHex);
        tg.setBackgroundColor?.(bgHex);
      } catch {}
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isLight: theme === 'light' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
