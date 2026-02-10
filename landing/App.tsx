
import React from 'react';
import Navbar from './components/Navbar';
import DownloadButtons from './components/DownloadButtons';
import AppMockup from './components/AppMockup';
import { APP_NAME } from './constants';

const App: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-[#ffffff] selection:bg-[#fa2d48] selection:text-white font-inter overflow-x-hidden relative">

      {/* Subtle tonal glow (kept within brand background) */}
      <div className="absolute -top-40 -right-24 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#f6f1ff] to-[#ffffff] blur-[90px] opacity-70" />
      <div className="absolute -bottom-44 -left-32 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-[#f2f6ff] to-[#ffffff] blur-[100px] opacity-70" />

      {/* Fixed Top Bar */}
      <Navbar />

      {/* Main Hero Section - Scaled for vertical fit */}
      <main className="flex-1 flex flex-col lg:flex-row lg:items-start items-center lg:items-stretch lg:justify-center px-8 md:px-16 lg:px-24 pt-[64px] sm:pt-[68px] pb-6 max-w-[1300px] mx-auto w-full relative z-10">

        {/* Left Side: Content Column */}
        <div className="w-full lg:w-[50%] flex flex-col justify-center h-auto lg:pr-10 text-center lg:text-left py-4 lg:py-12 lg:items-start">

          <div className="flex flex-col items-center lg:items-start">
            <div className="space-y-3.5">
              <h1 className="text-[36px] sm:text-[44px] lg:text-[56px] font-bold tracking-[-0.05em] leading-[1.03] text-[#1d1d1f]">
                Organize <br />
                <span className="text-[#7a7486]">Every File</span>
              </h1>
              <p className="text-[14.5px] sm:text-[16px] text-[#1d1d1f]/50 max-w-[460px] font-medium leading-[1.7] tracking-tight">
                Sort thousands of files in seconds — clean names, smart grouping, and safe undo.
              </p>
            </div>

            {/* Action Bar */}
            <div className="mt-7 lg:mt-9 flex flex-col items-center lg:items-start gap-4">
              <DownloadButtons className="justify-center lg:justify-start scale-[0.9] lg:scale-95 origin-left" variant="dark" />
              <div className="flex items-center gap-6 text-[11px] font-semibold text-[#1d1d1f]/55">
                <span>Works offline</span>
                <span>Undo anytime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Product UI Mockup */}
        <div className="w-full lg:w-[50%] flex justify-center lg:justify-end items-start lg:items-center h-auto pt-10 pb-4 lg:py-10 pointer-events-none select-none overflow-hidden lg:translate-y-3">
          <div className="w-full max-w-[480px] max-h-[360px] overflow-hidden rounded-[26px] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
            <div className="opacity-85 saturate-50 contrast-[0.97]">
              <AppMockup />
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Perfectly aligned footer links and copyright */}
      <footer className="w-full bg-white/30 backdrop-blur-md border-t border-white flex-shrink-0 z-20 mt-auto">
        <div className="mx-auto max-w-[1300px] px-8 md:px-16 lg:px-24 py-4 lg:py-5 flex flex-col md:flex-row items-center justify-between text-[11px] font-semibold tracking-tight text-[#a6a6ab]">
          <a className="hover:text-[#6b6b70] transition-colors" href="#support">Support</a>
          <div className="opacity-70 cursor-default uppercase tracking-widest mt-2 md:mt-0">
            &copy; 2026 File Organizer Inc.
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        main {
          animation: reveal-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
