
import React, { useMemo } from 'react';
import { PipelineStep, StepId, FileChange, PipelinePreset, PipelineConfig } from '../types';

interface PipelineSummaryProps {
  steps: PipelineStep[];
  rules: Record<StepId, string[]>;
  onProcessAll: () => void;
  hasConfig: boolean;
  presets?: PipelinePreset[];
  onApplyPreset?: (preset: PipelinePreset) => void;
  config: PipelineConfig;
  setConfig: React.Dispatch<React.SetStateAction<PipelineConfig>>;
  activePresetId?: string;
}

export const PipelineSummary: React.FC<PipelineSummaryProps> = ({
  steps,
  onProcessAll,
  hasConfig,
  presets,
  onApplyPreset,
  config,
  setConfig,
  activePresetId
}) => {
  // Consolidate all results from processed steps
  const consolidatedResults = useMemo(() => {
    const allResults: Record<string, FileChange> = {};
    steps.forEach(step => {
      if (step.results && step.results.length > 0) {
        step.results.forEach(res => {
          // We keep the latest transformation found in the pipeline sequence
          allResults[res.original] = res;
        });
      }
    });
    return Object.values(allResults);
  }, [steps]);

  const hasAnalyzedAny = consolidatedResults.length > 0;

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-[#161618]">
      <div className="p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">

        {hasAnalyzedAny ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Results Header */}
            <div className="text-center space-y-2">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#fa233b]">Final Manifest</h3>
            </div>

            {/* Adjust Configuration Button */}
            <div className="flex justify-end">
              <button
                onClick={() => window.location.reload()}
                className="text-[12px] font-bold text-[#fa233b] bg-[#fa233b]/10 hover:bg-[#fa233b]/20 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path></svg>
                <span>Adjust Configuration</span>
              </button>
            </div>

            {/* Results Table */}
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
                    {consolidatedResults.map((file, idx) => (
                      <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
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
                          <span className="font-mono text-[12px] text-[#fa233b] font-medium truncate max-w-[200px] block" title={file.new}>
                            {file.new}
                          </span>
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

            {/* Action Button */}
            <div className="flex justify-center">
              <button
                onClick={onProcessAll}
                className="group px-8 py-3 bg-[#fa233b] hover:bg-[#ff3b53] text-white rounded-lg font-bold shadow-lg shadow-[#fa233b]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                disabled={!hasConfig}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  <span>Execute All Operations</span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Empty State - Pipeline Ready */
          <div className="h-full flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in duration-500">


            <h3 className="text-2xl font-black text-white mb-3">Ready to Process</h3>
            <p className="text-[#8e8e93] max-w-sm mb-8 leading-relaxed">
              Your pipeline is configured. Review the final results below after executing the tasks.
            </p>

            <button
              onClick={onProcessAll}
              disabled={!hasConfig}
              className="group px-8 py-4 bg-[#fa233b] hover:bg-[#ff3b53] text-white rounded-2xl font-bold shadow-lg shadow-[#fa233b]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span>Execute Operation</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};






