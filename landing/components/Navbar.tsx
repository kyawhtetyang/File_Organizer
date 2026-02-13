import React from 'react';
import { APP_NAME } from '../constants';

const Navbar: React.FC = () => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const isUpdates = pathname === '/updates' || hash === '#/updates';

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/60 backdrop-blur-2xl border-b border-white/40 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
      <div className="mx-auto max-w-[1300px] h-[70px] flex items-center justify-between px-6 sm:px-8 md:px-12 lg:px-20 xl:px-24">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3.5 cursor-default h-full group">
          <div className="w-[34px] h-[34px] rounded-[9px] shadow-[0_6px_14px_rgba(0,0,0,0.18)] shrink-0 overflow-hidden transition-transform duration-300 group-hover:scale-105 active:scale-95">
            <img
              src="/app-current.png"
              alt="File Organizer app icon"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-[18px] font-bold tracking-tight text-[#1d1d1f]">
            {APP_NAME}
          </span>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-5 text-[12px] font-semibold pr-0.5">
          <a
            href="/#/"
            className={`${!isUpdates ? 'text-[#1d1d1f]' : 'text-[#1d1d1f]/55 hover:text-[#1d1d1f]'} transition-colors`}
          >
            Home
          </a>
          <a
            href="/#/updates"
            className={`${isUpdates ? 'text-[#1d1d1f]' : 'text-[#1d1d1f]/55 hover:text-[#1d1d1f]'} transition-colors`}
          >
            Updates
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

