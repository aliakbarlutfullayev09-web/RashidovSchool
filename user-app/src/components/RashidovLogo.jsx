import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function RashidovLogo({ className = "h-8", alt = "Rashidov School" }) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  return (
    <div className="flex items-center justify-center select-none py-1">
      <img 
        src="/rashidov-logo-original.png" 
        alt={alt} 
        className={`w-auto object-contain transition-all duration-200 ${
          isLight
            ? 'brightness-0 opacity-90 drop-shadow-none'
            : 'filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]'
        } ${className}`} 
      />
    </div>
  );
}
