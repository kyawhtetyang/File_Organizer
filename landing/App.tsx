import React from 'react';
import Navbar from './components/Navbar';
import DownloadButtons from './components/DownloadButtons';
import { APP_NAME } from './constants';

const RELEASES = [
  {
    version: 'v0.2.0',
    date: '2026-02-11',
    notes: [
      'Manual Presets Save now locks logic like Preset Store mode.',
      'Preview and sidebar file counts are more consistent and refresh correctly.',
      'Adjust Configuration now triggers fresh recount after execute.',
      'Invisible files are preserved by default for safer processing.',
      'Deduplicate faster-process toggle is correctly wired backend-side.',
      'Persistent global processing limit support with safer defaults.'
    ]
  },
  {
    version: 'v0.1.0',
    date: '2025-02-10',
    notes: [
      'Initial desktop release for File Organizer.',
      'Core file pipeline: Standardize, Deduplicate, Filename, Group, Transfer.',
      'Undo support and preset-based setup workflow.'
    ]
  }
];

const Footer: React.FC = () => (
  <footer className="w-full bg-white/30 backdrop-blur-md border-t border-white z-20">
    <div className="mx-auto max-w-[1300px] px-6 sm:px-8 md:px-12 lg:px-20 xl:px-24 py-4 lg:py-5 flex flex-col md:flex-row items-center justify-between text-[11px] font-semibold tracking-tight text-[#a6a6ab]">
      <a className="hover:text-[#6b6b70] transition-colors" href="/#/updates">Updates</a>
      <div className="opacity-70 cursor-default uppercase tracking-widest mt-2 md:mt-0">
        &copy; 2026 {APP_NAME}
      </div>
    </div>
  </footer>
);

const UpdatesPage: React.FC = () => (
  <div className="w-full bg-[#ffffff] selection:bg-[#fa2d48] selection:text-white font-inter overflow-x-hidden relative">
    <div className="absolute -top-40 -right-24 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#f6f1ff] to-[#ffffff] blur-[90px] opacity-70" />
    <div className="absolute -bottom-44 -left-32 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-[#f2f6ff] to-[#ffffff] blur-[100px] opacity-70" />
    <Navbar />
    <main className="pt-[94px] pb-10 px-6 sm:px-8 md:px-12 lg:px-20 xl:px-24 max-w-[1300px] mx-auto w-full relative z-10">
      <div className="mb-7">
        <h1 className="text-[34px] sm:text-[42px] font-bold tracking-tight text-[#1d1d1f]">{APP_NAME} Updates</h1>
        <p className="mt-2 text-[14px] text-[#1d1d1f]/55">Release history and version notes.</p>
      </div>
      <div className="space-y-4 max-w-[920px] ml-0">
        {RELEASES.map((release) => (
          <section key={release.version} className="rounded-[20px] border border-[#ececf2] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-[21px] font-bold tracking-tight text-[#1d1d1f]">{release.version}</h2>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8a8a92]">{release.date}</span>
            </div>
            <ul className="mt-4 space-y-2">
              {release.notes.map((note) => (
                <li key={note} className="flex items-start gap-2.5 text-[13px] text-[#3b3b3f]">
                  <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[#fa2d48]" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
    <Footer />
  </div>
);

const App: React.FC = () => {
  const isUpdatesPage = typeof window !== 'undefined' && (
    window.location.pathname === '/updates' || window.location.hash === '#/updates'
  );
  if (isUpdatesPage) return <UpdatesPage />;

  return (
    <div className="w-full bg-[#ffffff] selection:bg-[#fa2d48] selection:text-white font-inter overflow-x-hidden relative">

      {/* Subtle tonal glow (kept within brand background) */}
      <div className="absolute -top-40 -right-24 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#f6f1ff] to-[#ffffff] blur-[90px] opacity-70" />
      <div className="absolute -bottom-44 -left-32 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-[#f2f6ff] to-[#ffffff] blur-[100px] opacity-70" />

      {/* Fixed Top Bar */}
      <Navbar />

      {/* Main Hero Section */}
      <main className="px-6 sm:px-8 md:px-12 lg:px-20 xl:px-24 pt-[80px] sm:pt-[86px] pb-10 max-w-[1300px] mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-9 lg:gap-14 items-start">
          <div className="text-center lg:text-left">
            <div className="space-y-3.5 max-w-[560px] mx-auto lg:mx-0">
              <h1 className="text-[36px] sm:text-[44px] lg:text-[56px] font-bold tracking-[-0.05em] leading-[1.03] text-[#1d1d1f]">
                Organize <span className="text-[#7a7486]">Every File</span>
              </h1>
              <p className="text-[14.5px] sm:text-[16px] text-[#1d1d1f]/50 max-w-[500px] mx-auto lg:mx-0 font-medium leading-[1.7] tracking-tight">
                Sort thousands of files in seconds — clean names, smart grouping, and safe undo.
              </p>
            </div>
            <div className="mt-7 flex items-center justify-center lg:justify-start gap-6 text-[11px] font-semibold text-[#1d1d1f]/55 tracking-tight">
              <span>Works offline</span>
              <span>Undo anytime</span>
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end pt-1 lg:pt-4">
            <DownloadButtons className="scale-[0.94] lg:scale-100 origin-center lg:origin-right" variant="dark" />
          </div>
        </div>

        <div className="mt-8 lg:mt-9">
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
            <div className="w-full rounded-[22px] border border-[#ececf2] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.05)] overflow-hidden">
              <img
                src="/setup-page.png"
                alt="File Organizer setup page"
                className="w-full h-auto object-cover"
              />
              <div className="px-4 py-3 border-t border-[#f0f1f5] text-[11px] sm:text-[12px] font-medium text-[#1d1d1f]/60">
                Setup page
              </div>
            </div>
            <div className="w-full rounded-[22px] border border-[#ececf2] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.05)] overflow-hidden">
              <img
                src="/summary-page.png"
                alt="File Organizer summary page"
                className="w-full h-auto object-cover"
              />
              <div className="px-4 py-3 border-t border-[#f0f1f5] text-[11px] sm:text-[12px] font-medium text-[#1d1d1f]/60">
                Summary page
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Release Notes */}
      <section className="relative z-10 w-full pb-8">
        <div className="mx-auto max-w-[1300px] px-6 sm:px-8 md:px-12 lg:px-20 xl:px-24">
          <div className="rounded-[24px] border border-[#ececf2] bg-white/80 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-[#1d1d1f]">
                What&apos;s New in v0.2.0
              </h2>
              <a
                href="https://github.com/kyawhtetyang/File_Organizer/releases/tag/v0.2.0"
                className="text-[12px] font-semibold text-[#fa2d48] hover:text-[#df1f3b] transition-colors"
              >
                Read Full Release Notes
              </a>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'Manual Presets Save now locks logic like Preset Store mode.',
                'Preview and sidebar file counts are more consistent and refresh correctly.',
                'Adjust Configuration now triggers fresh recount after execute.',
                'Invisible files are preserved by default for safer processing.',
                'Deduplicate faster-process toggle is correctly wired backend-side.',
                'Persistent global processing limit support with safer defaults.'
              ].map((note) => (
                <div key={note} className="flex items-start gap-2.5 text-[13px] text-[#3b3b3f]">
                  <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[#fa2d48]" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />

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
