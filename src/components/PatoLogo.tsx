import React from 'react';

export const PATOFOOT_LOGO_URL =
  '/assets/aistudio/WhatsApp_Image_2026-11-26_at_11.31.29_ea5de89e.jpeg';

interface PatoLogoProps {
  className?: string;
  size?: number;
}

export const PatoLogo: React.FC<PatoLogoProps> = ({ className = '', size = 36 }) => {
  return (
    <img
      src={PATOFOOT_LOGO_URL}
      alt="Logo PATOFOOT"
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size }}
      className={`object-contain rounded-lg bg-black shrink-0 select-none ${className}`}
    />
  );
};
