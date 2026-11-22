import React from 'react';

export default function RashidovLogo({ className = "h-8", alt = "Rashidov School" }) {
  return (
    <div className="flex items-center justify-center select-none py-1">
      <img 
        src="/rashidov-logo-original.png" 
        alt={alt} 
        className={`w-auto object-contain filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)] transition-transform ${className}`} 
      />
    </div>
  );
}
