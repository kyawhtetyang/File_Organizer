
import React from 'react';
import { Icons } from '../constants';

interface DownloadButtonsProps {
  className?: string;
  variant?: 'dark' | 'white';
}

const DownloadButtons: React.FC<DownloadButtonsProps> = ({ className = "", variant = 'dark' }) => {
  const baseStyle = "flex items-center px-7 py-3 rounded-2xl transition-all duration-300 active:scale-[0.97] whitespace-nowrap border border-transparent";
  const primaryStyle = "bg-[#1d1d1f] text-white hover:bg-black shadow-lg shadow-black/10";

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      {/* Primary Download */}
      <a
        href="#download"
        className={`${baseStyle} ${primaryStyle}`}
        onClick={(e) => e.preventDefault()}
      >
        <Icons.Download />
        <div className="text-left leading-none">
          <div className="text-[10px] font-semibold uppercase opacity-50 tracking-widest mb-1">Download for Mac</div>
          <div className="text-[17px] font-bold tracking-tight">Direct Download</div>
        </div>
      </a>

      {/* Secondary */}
      <a
        href="#app-store"
        onClick={(e) => e.preventDefault()}
        className="text-[12px] font-semibold text-[#1d1d1f]/70 hover:text-[#1d1d1f] transition-colors"
      >
        Get it on the App Store
      </a>
    </div>
  );
};

export default DownloadButtons;

