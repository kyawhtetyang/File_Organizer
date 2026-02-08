import React, { useState, useEffect } from 'react';

import { PipelineConfig, PipelinePreset, UndoHistoryEntry } from '../types';
import { pipelineApi } from '../services/api';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: PipelineConfig;
    setConfig: React.Dispatch<React.SetStateAction<PipelineConfig>>;
    presets?: PipelinePreset[];
    onApplyPreset?: (preset: PipelinePreset) => void;
    activePresetId?: string;
    showCounts: boolean;
    setShowCounts: (show: boolean) => void;
}

type SettingsTab = 'general' | 'config' | 'history' | 'appearance' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    config,
    setConfig,
    presets,
    onApplyPreset,
    activePresetId,
    showCounts,
    setShowCounts
}) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [theme, setTheme] = useState('System');
    const [undoHistory, setUndoHistory] = useState<UndoHistoryEntry[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const loadUndoHistory = async () => {
        setIsLoadingHistory(true);
        const history = await pipelineApi.getUndoHistory();
        setUndoHistory(history);
        setIsLoadingHistory(false);
    };

    useEffect(() => {
        if (isOpen && activeTab === 'history') {
            loadUndoHistory();
        }
    }, [isOpen, activeTab]);

    if (!isOpen) return null;

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        {
            id: 'general',
            label: 'General',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
        },
        {
            id: 'config',
            label: 'Configuration',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        },
        {
            id: 'history',
            label: 'Undo History',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
        },
        {
            id: 'appearance',
            label: 'Appearance',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
        },
        {
            id: 'about',
            label: 'About',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-[680px] h-[520px] bg-[#1c1c1e] rounded-2xl shadow-2xl border border-white/10 flex overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Sidebar */}
                <div className="w-60 bg-[#2c2c2e]/50 border-r border-white/5 p-4 flex flex-col">
                    <div className="text-xs font-bold text-[#86868b] uppercase tracking-wider mb-4 px-2">Settings</div>
                    <div className="space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-[#fa233b] text-white'
                                    : 'text-[#86868b] hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#1c1c1e]">
                    {/* Header */}
                    <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#1c1c1e] z-10">
                        <h2 className="text-lg font-bold text-white">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[#86868b] hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                        {activeTab === 'general' && (
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-[12px] font-bold text-white/50 uppercase tracking-wider border-b border-white/5 pb-2">Interface</h3>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-[13px] font-medium text-white mb-1">Sidebar File Counts</div>
                                            <div className="text-[11px] text-[#86868b]">Show number of files processed in sidebar.</div>
                                        </div>
                                        <div
                                            onClick={() => setShowCounts(!showCounts)}
                                            className={`
                                                w-9 h-5 rounded-full transition-colors duration-300 ease-out relative cursor-pointer
                                                ${showCounts ? 'bg-[#fa233b]' : 'bg-[#3a3a3c] hover:bg-[#48484a]'}
                                            `}
                                        >
                                            <div className={`
                                                absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 cubic-bezier(0.175, 0.885, 0.32, 1.275)
                                                ${showCounts ? 'translate-x-4' : 'translate-x-0'}
                                            `} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[12px] font-bold text-white/50 uppercase tracking-wider border-b border-white/5 pb-2">Application</h3>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-[13px] font-medium text-white mb-1">Clear Application Cache</div>
                                            <div className="text-[11px] text-[#86868b]">Reset temporary data and states.</div>
                                        </div>
                                        <button className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[12px] font-bold rounded-lg border border-white/5 transition-colors">
                                            Clear Cache
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'config' && (
                            <div className="space-y-6">
                                {/* File Categories (Many Options -> Dropdown) */}
                                <div className="flex items-center justify-between py-3 border-b border-white/5">
                                    <div>
                                        <div className="text-[13px] font-medium text-white">File Categories</div>
                                        <div className="text-[11px] text-[#8e8e93]">Filter which files to process</div>
                                    </div>
                                    <div className="relative group">
                                        <select
                                            value={config.fileCategory}
                                            onChange={(e) => setConfig(prev => ({ ...prev, fileCategory: e.target.value as any }))}
                                            className="appearance-none bg-transparent text-white text-[12px] font-bold py-2 pl-3 pr-8 rounded-lg focus:outline-none cursor-pointer hover:text-white/80"
                                        >
                                            <option value="all">All Files</option>
                                            <option value="photos">Photos Only</option>
                                            <option value="video">Videos Only</option>
                                            <option value="audio">Audio Files</option>
                                            <option value="docs">Documents</option>
                                            <option value="code">Source Code</option>
                                            <option value="others">Archives/Others</option>
                                        </select>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e8e93]">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Timestamp Format (2 Options -> Toggle) */}
                                <div className="flex items-center justify-between py-3 border-b border-white/5">
                                    <div>
                                        <div className="text-[13px] font-medium text-white">12-Hour Format</div>
                                        <div className="text-[11px] text-[#8e8e93]">
                                            {config.timestamp_format.hour_format_12 ? "Example: 1993-07-12 4:52AM" : "Example: 1993-07-12 04:52"}
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => setConfig(prev => ({ ...prev, timestamp_format: { ...prev.timestamp_format, hour_format_12: !prev.timestamp_format.hour_format_12 } }))}
                                        className={`
                                            w-9 h-5 rounded-full transition-colors duration-300 ease-out relative cursor-pointer
                                            ${config.timestamp_format.hour_format_12 ? 'bg-[#fa233b]' : 'bg-[#3a3a3c] hover:bg-[#48484a]'}
                                        `}
                                    >
                                        <div className={`
                                            absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 cubic-bezier(0.175, 0.885, 0.32, 1.275)
                                            ${config.timestamp_format.hour_format_12 ? 'translate-x-4' : 'translate-x-0'}
                                        `} />
                                    </div>
                                </div>

                                {/* Simulation Mode (2 Options -> Toggle) */}
                                <div className="flex items-center justify-between py-3 border-b border-white/5">
                                    <div>
                                        <div className="text-[13px] font-medium text-white">Simulation Mode</div>
                                        <div className="text-[11px] text-[#8e8e93]">Preview changes without modifying files</div>
                                    </div>
                                    <div
                                        onClick={() => setConfig(prev => ({ ...prev, isDryRun: !prev.isDryRun }))}
                                        className={`
                                            w-9 h-5 rounded-full transition-colors duration-300 ease-out relative cursor-pointer
                                            ${config.isDryRun ? 'bg-[#fa233b]' : 'bg-[#3a3a3c] hover:bg-[#48484a]'}
                                        `}
                                    >
                                        <div className={`
                                            absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 cubic-bezier(0.175, 0.885, 0.32, 1.275)
                                            ${config.isDryRun ? 'translate-x-4' : 'translate-x-0'}
                                        `} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-[13px] font-medium text-white">Undo History</div>
                                        <div className="text-[11px] text-[#8e8e93]">Real actions only (up to 10 most recent). Only the latest can be undone.</div>
                                    </div>
                                    <button
                                        onClick={loadUndoHistory}
                                        className="px-3 py-1.5 text-[12px] font-bold text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10"
                                    >
                                        Refresh
                                    </button>
                                </div>

                                <div className="overflow-hidden border border-white/5 rounded-2xl bg-[#1c1c1e]/50">
                                    <table className="w-full text-left border-collapse table-fixed">
                                        <thead className="bg-white/[0.02]">
                                            <tr>
                                                <th className="px-4 py-3 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider border-b border-white/5">Operation</th>
                                                <th className="px-4 py-3 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider border-b border-white/5">Timestamp</th>
                                                <th className="px-4 py-3 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider border-b border-white/5">Changes</th>
                                                <th className="px-4 py-3 text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider border-b border-white/5 text-center w-[140px]">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {isLoadingHistory && (
                                                <tr>
                                                    <td className="px-4 py-4 text-[12px] text-[#8e8e93]" colSpan={4}>
                                                        Loading history...
                                                    </td>
                                                </tr>
                                            )}
                                            {!isLoadingHistory && undoHistory.length === 0 && (
                                                <tr>
                                                    <td className="px-4 py-4 text-[12px] text-[#8e8e93]" colSpan={4}>
                                                        No undo history found.
                                                    </td>
                                                </tr>
                                            )}
                                            {!isLoadingHistory && undoHistory.map((entry, index) => {
                                                const isLatest = index === 0;
                                                const label = entry.id.startsWith('summary_') ? 'Summary' : entry.id;
                                                return (
                                                    <tr key={entry.id} className="group hover:bg-white/5">
                                                        <td className="px-4 py-3 text-[12px] font-mono text-white/80 truncate" title={entry.id}>
                                                            {label}
                                                        </td>
                                                        <td className="px-4 py-3 text-[12px] text-[#8e8e93]">
                                                            {new Date(entry.timestamp).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-[12px] text-[#8e8e93]">
                                                            {entry.changes?.length || 0}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={async () => {
                                                                    if (!isLatest) return;
                                                                    const result = await pipelineApi.undoOperation(entry.id);
                                                                    if (result.success) {
                                                                        await loadUndoHistory();
                                                                    } else {
                                                                        alert(result.message || 'Undo failed');
                                                                    }
                                                                }}
                                                                disabled={!isLatest}
                                                                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${
                                                                    isLatest
                                                                        ? 'text-[#fa233b] border-[#fa233b]/40 bg-[#fa233b]/10 hover:bg-[#fa233b]/20'
                                                                        : 'text-[#86868b] border-white/10 bg-white/5 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                Undo
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-[12px] font-bold text-white/50 uppercase tracking-wider border-b border-white/5 pb-2">Theme</h3>

                                    <div className="flex items-center space-x-4">
                                        {['System', 'Dark', 'Light'].map(option => (
                                            <button
                                                key={option}
                                                onClick={() => setTheme(option)}
                                                className={`flex-1 py-3 rounded-xl border  text-[12px] font-bold transition-all ${theme === option
                                                    ? 'bg-[#fa233b]/10 border-[#fa233b] text-[#fa233b]'
                                                    : 'bg-black/20 border-white/5 text-[#86868b] hover:bg-black/40'
                                                    }`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[12px] font-bold text-white/50 uppercase tracking-wider border-b border-white/5 pb-2">Density</h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[13px] font-medium text-white">Compact Mode</span>
                                        <div className="w-10 h-6 bg-white/10 rounded-full cursor-not-allowed relative">
                                            <div className="absolute left-1 top-1 w-4 h-4 bg-white/30 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'about' && (
                            <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
                                <div className="w-16 h-16 bg-[#fa233b] rounded-2xl flex items-center justify-center shadow-xl shadow-[#fa233b]/20">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-white font-bold text-lg">File Organizer Pro</h3>
                                    <p className="text-[#86868b] text-sm">Version 7.2.1</p>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};



