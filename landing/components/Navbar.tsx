
import React from 'react';
import { APP_NAME } from '../constants';

const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/60 backdrop-blur-2xl border-b border-white/40 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
      <div className="mx-auto max-w-[1300px] h-[68px] flex items-center justify-between px-8 md:px-16 lg:px-24">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3.5 cursor-default h-full group">
          <div className="w-[34px] h-[34px] bg-[#111111] rounded-[9px] flex items-center justify-center shadow-[0_6px_14px_rgba(0,0,0,0.18)] shrink-0 overflow-hidden transition-transform duration-300 group-hover:scale-105 active:scale-95">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 7h10M7 12h7M7 17h9" />
              <path d="M5 6v12" />
            </svg>
          </div>
          <span className="text-[18px] font-bold tracking-tight text-[#1d1d1f]">
            {APP_NAME}
          </span>
        </div>

        {/* Navigation */}
        <div />
      </div>
    </nav>
  );
};

export default Navbar;

