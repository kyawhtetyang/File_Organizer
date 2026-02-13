import React, { useEffect, useState } from 'react';
import { PipelineConfig, PipelineStep, StepId, FileChange } from '../types';
import { pipelineApi } from '../services/api';

interface PreviewProps {
    config: PipelineConfig;
}

export const Preview: React.FC<PreviewProps> = ({ config }) => {
    const [files, setFiles] = useState<FileChange[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastScannedAt, setLastScannedAt] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadFiles = async () => {
            if (!config.sourceDir) {
                if (isMounted) setFiles([]);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // Use existing scanPath API but request more details if needed
                // Currently scanPath returns count/exists.
                // We might need a new endpoint or update scanPath to return file list.
                // For now, let's assume we use a new endpoint or updated one.
                // Let's use runStep with a dummy step or a new "preview" step strictly for listing.
                // Actually, the best way given current API is to use a specific endpoint for listing.
                // Since we don't have one explicitly for listing files without processing,
                // we'll assume we need to add a simple listing capability or use what's available.

                // Inspecting server.py (from context), there is /api/scan-path but it returns count.
                // There is no explicit "list files" endpoint.
                // However, we can use `run-step` with a "dry run" on a "no-op" step?
                // Or better, let's ADD a simple list endpoint to server.py or use an existing one if I missed it.
                // Checking server.py content from memory...
                // It has `/api/run-step`.

                // Let's try to misuse `Standardize` step in dry-run as a preview?
                // No, that applies changes.

                // We likely need to add a "list_files" endpoint to backend to support this properly.
                // BUT, to avoid backend changes right now if possible, let's look at `scanPath`.
                // limit=5000.

                // Wait, the user wants a TABLE like others.
                // Other steps receive `results: FileChange[]`.
                // So we need to fetch `FileChange[]` where original=new (no change).

                // I will add a `list_files` method to `pipelineApi` and backend `server.py`
                // to support this "Preview" feature correctly.

                // For this component, I'll assume the API exists for now.
                const res = await pipelineApi.listFiles(config.sourceDir, config.fileCategory);
                if (isMounted) {
                    if (res.success) {
                        // Map file objects to FileChange format for the table
                        setFiles(res.files.map((f: any) => ({
                            original: f.name,
                            new: f.name,
                            status: 'pending',
                            size: f.size // Store size for display
                        })));
                        setLastScannedAt(new Date().toLocaleTimeString());
                    } else {
                        setError(res.error || 'Failed to list files');
                    }
                }
            } catch (err) {
                if (isMounted) setError(String(err));
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadFiles();

        return () => { isMounted = false; };
    }, [config.sourceDir, config.fileCategory]);

    if (!config.sourceDir) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-50">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">No Source Selected</h3>
                <p className="text-[#8e8e93] text-sm">Please select a source directory in Setup.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-8 h-8 border-2 border-[#fa233b] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#8e8e93] text-xs font-mono">Scanning files...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center text-[#fa233b]">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-[#161618]">
            <div className="p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">

                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#fa233b]">Source Preview</h3>
                    <div className="flex items-center gap-2">
                        {lastScannedAt && (
                            <div className="text-[10px] font-mono text-[#8e8e93] bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                                Last scanned at {lastScannedAt}
                            </div>
                        )}
                        <div className="text-[11px] font-bold text-[#8e8e93] bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                            {files.length} Files Found
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-[#1c1c1e] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="py-3 px-4 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider w-[50%]">Original File</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider w-[20%]">Type</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider w-[30%] text-right">Size</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {files.slice(0, config.max_preview_files || 100).map((file, idx) => (
                                    <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center space-x-3">
                                                <svg className="w-4 h-4 text-[#8e8e93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                                </svg>
                                                <span className="font-mono text-[12px] text-[#e5e5e5] opacity-90 truncate max-w-[300px] block" title={file.original}>
                                                    {file.original}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-[11px] text-[#8e8e93] font-mono">
                                                {file.original.split('.').pop()?.toUpperCase() || 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <span className="text-[11px] text-[#8e8e93] font-mono">
                                                {(file as any).size ?
                                                    ((file as any).size < 1024 * 1024
                                                        ? `${((file as any).size / 1024).toFixed(1)} KB`
                                                        : `${((file as any).size / (1024 * 1024)).toFixed(1)} MB`)
                                                    : '-'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {files.length > (config.max_preview_files || 100) && (
                    <div className="text-center text-[11px] text-[#8e8e93] py-2">
                        Displaying first {config.max_preview_files || 100} files.
                    </div>
                )}
            </div>
        </div>
    );
};

