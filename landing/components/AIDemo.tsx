
import React, { useState } from 'react';
import { organizeFilesWithAI } from '../services/gemini';

const FileIcon = ({ type }: { type: string }) => {
  const t = type.toLowerCase();
  if (t.includes('jpg') || t.includes('png') || t.includes('img')) return <span className="text-pink-500">🖼️</span>;
  if (t.includes('pdf')) return <span className="text-red-500">📄</span>;
  if (t.includes('doc') || t.includes('txt')) return <span className="text-blue-500">📝</span>;
  if (t.includes('xls') || t.includes('csv')) return <span className="text-green-500">📊</span>;
  return <span className="text-gray-400">📁</span>;
};

const AIDemo: React.FC = () => {
  const [input, setInput] = useState("Vacation_01.jpg, Resume_v2.pdf, Invoice_Dec.pdf, Budget.xlsx, Profile_Shot.png");
  const [result, setResult] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    const data = await organizeFilesWithAI(input);
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Glow Backdrop */}
      <div className="absolute -inset-10 bg-indigo-500/5 blur-[100px] rounded-full" />

      <div className="relative bg-white rounded-3xl shadow-[0_48px_100px_-20px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden">
        {/* App Bar */}
        <div className="bg-gray-50/80 backdrop-blur-md px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-500 font-bold">
            <span className="opacity-50">Vault</span> / <span className="text-indigo-600">AI-Smart-Sort</span>
          </div>
          <div className="w-8" />
        </div>

        <div className="p-8 h-[380px] flex flex-col">
          {result ? (
            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-6">
              {result.map((folder: any, idx: number) => (
                <div key={idx} className="animate-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-sm mb-4">
                    <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    {folder.folder}
                  </div>
                  <div className="grid grid-cols-1 gap-3 pl-7">
                    {folder.files.map((file: string, fidx: number) => (
                      <div key={fidx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:bg-white hover:shadow-lg transition-all cursor-default">
                        <FileIcon type={file} />
                        <span className="text-xs text-gray-700 font-semibold truncate">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setResult(null)}
                className="w-full py-4 text-xs font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest border-t border-gray-100 mt-4 transition-colors"
              >
                ← Clear and start over
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 mb-2">Automated Sorting</h3>
                <p className="text-sm text-gray-500 font-medium mb-6">Type some filenames below to see how File Organizer would organize them into folders.</p>

                <div className="bg-gray-50 rounded-2xl p-5 border-2 border-dashed border-gray-200 focus-within:border-indigo-200 transition-colors">
                  <textarea
                    className="w-full bg-transparent text-gray-700 focus:outline-none font-mono text-xs resize-none leading-relaxed"
                    rows={4}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter filenames separated by commas..."
                  />
                </div>
              </div>

              <button
                onClick={handleTest}
                disabled={loading || !input.trim()}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>Sort Files with AI</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIDemo;

