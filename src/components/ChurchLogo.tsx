import React, { useState } from 'react';
// Use static path for logo in public folder
const sdaLogo = '/sda-logo.png';

interface ChurchLogoProps {
  className?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg' | 'receipt';
}

export const ChurchLogo: React.FC<ChurchLogoProps> = ({ 
  className = '', 
  fallbackText = '⛪',
  size = 'md'
}) => {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
  };

  if (hasError) {
    if (size === 'receipt') {
      return (
        <div className={`w-12 h-14 bg-blue-50 text-blue-600 mx-auto rounded-xl flex items-center justify-center border border-blue-100 font-extrabold text-lg print:border print:border-slate-300 a6-receipt-icon ${className}`}>
          {fallbackText}
        </div>
      );
    }
    if (size === 'sm') {
      return (
        <div className={`w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-base shadow-sm ${className}`}>
          {fallbackText}
        </div>
      );
    }
    return (
      <div className={`w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md ${className}`}>
        {fallbackText}
      </div>
    );
  }

  // Apply sizing classes match exact spacing ratios
  let sizeClass = "w-12 h-12 rounded-xl object-contain";
  if (size === 'receipt') {
    sizeClass = "w-12 h-14 mx-auto rounded-xl object-contain border border-blue-100 bg-white p-1 a6-receipt-icon";
  } else if (size === 'sm') {
    sizeClass = "w-8 h-8 rounded object-contain bg-white p-0.5 shadow-xs border border-slate-700/20";
  }

  return (
    <img
      src={sdaLogo}
      alt="Church Logo"
      onError={handleError}
      className={`${sizeClass} ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};
