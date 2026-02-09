import React from 'react';

const AppMockup: React.FC = () => {
  const items = [
    { name: 'Source', meta: 'Input', color: 'from-red-400 to-red-500', icon: 'folder' },
    { name: 'Target', meta: 'Output', color: 'from-rose-500 to-pink-500', icon: 'upload' },
    { name: 'Default', meta: 'Auto', color: 'from-amber-400 to-orange-500', icon: 'briefcase', active: true },
    { name: 'Clean', meta: 'Desktop', color: 'from-green-400 to-emerald-500', icon: 'monitor' },
    { name: 'Sort', meta: 'Download', color: 'from-cyan-400 to-sky-500', icon: 'download' },
    { name: 'Group', meta: 'Photos', color: 'from-blue-500 to-indigo-500', icon: 'camera' },
  ];

  const Icon = ({ type }: { type: string }) => {
    if (type === 'folder') {
      return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />;
    }
    if (type === 'upload') {
      return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-7l-4-4m0 0l-4 4m4-4v12" />;
    }
    if (type === 'briefcase') {
      return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 6V5a3 3 0 013-3h0a3 3 0 013 3v1m-9 0h10a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" />;
    }
    if (type === 'monitor') {
      return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zm6 12h4m-5 3h6" />;
    }
    if (type === 'download') {
      return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-5l-4 4m0 0l-4-4m4 4V4" />;
    }
    return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 7h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2zm6 4l2-2 2 2m-2-2v6" />;
  };

  return (
    <div className="relative w-full max-w-[520px] h-full max-h-[580px] rounded-[26px] bg-white shadow-[0_14px_36px_rgba(0,0,0,0.06)] ring-1 ring-black/5 overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-black/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center">
              <div className="w-3 h-3 bg-[#fa2d48] rounded-[3px]" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold tracking-tight text-[#111827]">Setup</h2>
              <div className="text-[10px] font-semibold text-[#6b7280]">Profiles</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8.5 h-8.5 rounded-full bg-[#f3f4f6] border border-black/5 flex items-center justify-center text-[#6b7280]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button className="w-8.5 h-8.5 rounded-full bg-[#f3f4f6] border border-black/5 flex items-center justify-center text-[#6b7280]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2m0 18v2m10-11h-2M4 12H2m15.36-7.36l-1.42 1.42M7.05 16.95l-1.42 1.42m0-12.72 1.42 1.42m12.72 12.72-1.42-1.42" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 pt-4 pb-5 grid grid-cols-1 gap-3">
        {items.slice(0, 3).map((item, i) => (
          <div
            key={i}
            className="relative rounded-[20px] bg-white border border-black/5 px-3.5 py-3.5 flex items-center gap-3.5 shadow-[0_5px_14px_rgba(0,0,0,0.05)]"
          >
            <div className={`w-11 h-11 rounded-[14px] bg-gradient-to-br ${item.color} flex items-center justify-center`}>
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <Icon type={item.icon} />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[#111827]">{item.name}</div>
              <div className="text-[11px] text-[#6b7280]">{item.meta}</div>
            </div>
            <div className={`w-4.5 h-4.5 rounded-full border ${item.active ? 'bg-[#111827] border-[#111827]' : 'border-black/15'}`}>
              {item.active && (
                <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppMockup;

