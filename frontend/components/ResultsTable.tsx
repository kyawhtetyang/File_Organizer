
import React from 'react';
import { FileChange } from '../types';

interface ResultsTableProps {
  files: FileChange[];
  isDark: boolean;
  rules?: string[];
  settings?: { description?: string; label: string; example?: React.ReactNode; key: string; value: boolean | string; options?: { value: string; label: string }[] }[];
  onSettingToggle?: (key: string) => void;
  onSettingChange?: (key: string, value: string) => void;
  onRun?: () => void;
  onReset?: () => void;
  isProcessing?: boolean;
  status?: string; // Add status prop
  hasConfig?: boolean;
  isEnabled?: boolean;
  locked?: boolean;
  customHeader?: React.ReactNode;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ files, isDark, rules = [], settings, onSettingToggle, onSettingChange, onRun, onReset, isProcessing, status, hasConfig, isEnabled = true, locked = false, customHeader }) => {
  // Show settings ONLY if status is IDLE (or undefined/initial) AND not processing
  // If status is SUCCESS but files is empty, we should show "No files found" message, NOT settings.
  const showSettings = (status === 'idle' || !status) && !isProcessing;

  if (showSettings) return (
    <div className="h-full flex flex-col items-center justify-center px-10 py-20 bg-transparent text-center overflow-y-auto custom-scrollbar">
      <style>
        {`
          @keyframes breathe {
            0%, 100% { transform: scale(1); box-shadow: 0 10px 40px -10px rgba(250, 35, 59, 0.4); }
            50% { transform: scale(1.02); box-shadow: 0 15px 50px -5px rgba(250, 35, 59, 0.6); }
          }
          .btn-pulse {
            animation: breathe 3s ease-in-out infinite;
          }
        `}
      </style>
      <div className="max-w-3xl w-full">


        <div className="space-y-10 text-left">
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

          {customHeader && (
            <div className="mb-6">
              {customHeader}
            </div>
          )}

          <div className="overflow-hidden border border-white/5 rounded-2xl bg-[#1c1c1e]/50">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-white/[0.02]">
                <tr>
                  <th className={`px-6 py-3 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider border-b border-white/5 text-left ${settings ? 'w-[220px]' : 'w-[280px]'}`}>
                    {settings ? 'Description' : 'Example Input'}
                  </th>
                  <th className={`px-6 py-3 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider border-b border-white/5 text-left ${settings ? 'w-[260px]' : 'w-auto'}`}>
                    {settings ? 'Setting / Rule' : 'Example Output'}
                  </th>
                  {settings && (
                    <th className="px-6 py-3 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider border-b border-white/5 text-center w-[200px]">
                      Status
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {settings ? (
                  // SETTINGS MODE (3 Columns)
                  settings.map((setting, i) => (
                    <tr key={i} className="group transition-colors hover:bg-white/5">
                      <td className="px-6 py-2.5 text-[12px] font-mono text-white/70 truncate max-w-[200px]">
                        {setting.description ? (
                          setting.description
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="px-6 py-2.5 text-[12px] font-mono text-white/80 truncate max-w-[240px]">
                        {setting.label}
                      </td>
                      <td className="px-6 py-3 text-center w-[200px]">
                        {setting.options ? (
                          // Segmented Control for multi-choice options
                          <div className={`flex items-center w-full rounded bg-[#3a3a3c] p-0.5 gap-0.5 ${(locked || !isEnabled) ? 'pointer-events-none opacity-50' : ''}`}>
                            {setting.options.map((option) => (
                              <button
                                key={option.value}
                                disabled={locked || !isEnabled}
                                onClick={() => onSettingChange && onSettingChange(setting.key, option.value)}
                                className={`
                                  flex-1 px-2.5 h-6 text-[10px] font-bold rounded transition-all duration-200
                                  ${setting.value === option.value
                                    ? 'bg-[#fa233b] text-white shadow-sm'
                                    : 'text-[#8e8e93] hover:text-white hover:bg-white/5'
                                  }
                                `}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        ) : typeof setting.value === 'boolean' ? (
                          <button
                            disabled={locked || !isEnabled}
                            onClick={() => onSettingToggle && onSettingToggle(setting.key)}
                            className={`
                              w-9 h-5 rounded-full transition-colors duration-300 ease-out relative focus:outline-none cursor-pointer
                              ${setting.value ? 'bg-[#fa233b]' : 'bg-[#3a3a3c] hover:bg-[#48484a]'}
                              ${(locked || !isEnabled) ? 'cursor-not-allowed opacity-50' : ''}
                            `}
                          >
                            <div className={`
                              absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 cubic-bezier(0.175, 0.885, 0.32, 1.275)
                              ${setting.value ? 'translate-x-4' : 'translate-x-0'}
                            `} />
                          </button>
                        ) : (
                          <input
                            type="text"
                            disabled={locked || !isEnabled}
                            value={setting.value as string}
                            onChange={(e) => onSettingChange && onSettingChange(setting.key, e.target.value)}
                            className={`
                              bg-[#3a3a3c] text-white text-[12px] font-mono px-2 py-1 rounded w-full text-center border outline-none
                              ${setting.key === 'start_datetime'
                                ? (/^\d{4}-\d{2}-\d{2} \d{1,2}[-:]\d{2}[-:]\d{2}(?:\s?[APap][Mm])?$/.test(setting.value as string) ? 'border-transparent focus:ring-1 focus:ring-[#fa233b]' : 'border-[#fa233b] focus:ring-1 focus:ring-[#fa233b]')
                                : 'border-transparent focus:ring-1 focus:ring-[#fa233b]'}
                              ${(locked || !isEnabled) ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            placeholder={setting.key === 'start_datetime' ? "YYYY-MM-DD HH-MM-SS PM" : ""}
                            title={setting.key === 'start_datetime' && !/^\d{4}-\d{2}-\d{2} \d{1,2}[-:]\d{2}[-:]\d{2}(?:\s?[APap][Mm])?$/.test(setting.value as string) ? "Invalid format: YYYY-MM-DD HH-MM-SS PM" : ""}
                          />
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  // RULES MODE (2 Columns)
                  rules.map((rule, i) => {
                    const parts = rule.split('➔');
                    const hasArrow = parts.length === 2;

                    return (
                      <tr key={i} className="group transition-colors hover:bg-white/5">
                      <td className="px-6 py-2.5 text-[12px] font-mono text-white/80 truncate max-w-[260px]" title={hasArrow ? parts[0].trim() : rule}>
                        {hasArrow ? parts[0].trim() : rule}
                      </td>
                      <td className="px-6 py-2.5 text-[12px] font-mono text-white/80 truncate max-w-[280px]" title={hasArrow ? parts[1].trim() : ''}>
                        {hasArrow ? (
                          <span>{parts[1].trim()}</span>
                          ) : (
                            <span className="text-white/20 italic">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center pt-6 pb-2">
            <button
              onClick={onRun}
              className="flex items-center space-x-2 px-8 py-3 bg-[#fa233b] hover:bg-[#fa233b]/90 text-white font-bold rounded-xl shadow-lg shadow-[#fa233b]/20 transition-all active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Run Operation</span>
            </button>
          </div>
        </div>


      </div>
    </div>
  );

  // Handle case where operation ran but returned no results
  if (files.length === 0 && !showSettings) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
        <div className="mb-4 p-4 rounded-full bg-white/5">
          <svg className="w-8 h-8 text-[#8e8e93]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Files Affected</h3>
        <p className="text-[#8e8e93] max-w-md mb-6">The operation completed successfully but no files matched the criteria for modification.</p>

        <button
          onClick={onReset}
          className="text-[13px] font-bold text-[#fa233b] bg-[#fa233b]/10 hover:bg-[#fa233b]/20 px-4 py-2 rounded-xl transition-colors"
        >
          Adjust Configuration
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#161618] overflow-y-auto custom-scrollbar">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Reset / Adjust Config Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onReset}
            className="text-[12px] font-bold text-[#fa233b] bg-[#fa233b]/10 hover:bg-[#fa233b]/20 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path></svg>
            <span>Adjust Configuration</span>
          </button>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#1c1c1e] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="py-3 px-4 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider w-[45%]">Original File</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider w-[45%]">New Name</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider w-[10%] text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {files.slice(0, 50).map((file, idx) => (
                  <tr key={idx} className="group hover:bg-white/[0.02] transition-colors row-animate" style={{ animationDelay: `${idx * 40}ms` }}>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <svg className="w-4 h-4 text-[#8e8e93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                        <span className="font-mono text-[12px] text-[#e5e5e5] opacity-90 truncate max-w-[200px] block" title={file.original}>
                          {file.original}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {file.new.toLowerCase().includes('deleted') ? (
                        <span className="text-[#fa233b] flex items-center font-bold font-sans text-[12px]">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          Marked for Removal
                        </span>
                      ) : (
                        <span className="font-mono text-[12px] text-[#fa233b] font-medium truncate max-w-[200px] block" title={file.new}>
                          {file.new}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className={`inline-flex px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-tight sans-serif ${file.status === 'success'
                        ? 'bg-[#34C759]/10 text-[#34C759]'
                        : 'bg-[#fa233b]/10 text-[#fa233b]'
                        }`}>
                        {file.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-6">
          {files.length > 50 && (
            <p className="text-[11px] text-[#8e8e93] font-medium bg-white/5 inline-block px-4 py-1.5 rounded-full border border-white/5">
              Showing first 50 of {files.length} items
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


