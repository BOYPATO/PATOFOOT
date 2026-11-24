import React from 'react';

interface PatoLogoProps {
  className?: string;
  size?: number;
}

export const PatoLogo: React.FC<PatoLogoProps> = ({ className = '', size = 36 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="darkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>

      {/* Shield Base (Black with Sky Blue border) */}
      <path
        d="M50 5 L88 20 C88 58 50 95 50 95 C50 95 12 58 12 20 Z"
        fill="url(#darkGrad)"
        stroke="url(#skyGrad)"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Dynamic Soccer Ball Pattern / Stars behind Duck */}
      <circle cx="50" cy="50" r="32" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />

      {/* Stylized Duck Head & Bill (Pato do Patofoot) */}
      {/* Duck Crown / Feather Tuft */}
      <path
        d="M48 24 C44 20 40 21 38 23 C42 27 46 29 48 31 Z"
        fill="#38bdf8"
      />
      
      {/* Duck Head & Neck */}
      <path
        d="M45 28 C36 29 32 37 34 47 C35 55 42 62 48 64 C42 68 37 72 32 78 C44 80 58 78 64 71 C67 67 66 58 63 52 C61 48 60 42 58 36 C55 30 50 28 45 28 Z"
        fill="url(#skyGrad)"
      />

      {/* Duck Eye (Determined soccer expression) */}
      <circle cx="46" cy="40" r="3.5" fill="#020617" />
      <circle cx="47" cy="39" r="1.2" fill="#ffffff" />

      {/* Duck Beak / Bill (Athletic & Sharp, Sky Blue/Gold accent) */}
      <path
        d="M58 41 C67 41 78 43 82 45 C77 48 68 50 56 49 Z"
        fill="#bae6fd"
        stroke="#0284c7"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="60" y1="44" x2="74" y2="44" stroke="#0369a1" strokeWidth="1.5" strokeLinecap="round" />

      {/* Small Classic Soccer Ball in Corner */}
      <circle cx="34" cy="72" r="7" fill="#ffffff" stroke="#020617" strokeWidth="1.5" />
      <polygon points="34,68 37,70 36,74 32,74 31,70" fill="#020617" />
    </svg>
  );
};
