import React, { useState, useEffect } from 'react';
import { PipelineConfig, PipelinePreset } from '../types';
import { pipelineApi } from '../services/api';

interface SetupProps {
    config: PipelineConfig;
    setConfig: React.Dispatch<React.SetStateAction<PipelineConfig>>;
    presets?: PipelinePreset[];
    onApplyPreset?: (preset: PipelinePreset) => void;
    activePresetId?: string;
    onContinue: () => void;
}

export const Setup: React.FC<SetupProps> = ({
    config,
    setConfig,
    presets,
    onApplyPreset,
    activePresetId,
    onContinue
}) => {
    const [activeCategory, setActiveCategory] = useState<'Featured' | 'Lifestyle' | 'Productivity'>('Featured');
    const [quickAssign, setQuickAssign] = useState<'source' | 'target' | null>(null);
    const [isPairModalOpen, setIsPairModalOpen] = useState(false);
    const [pairDraft, setPairDraft] = useState<{ source: string; target: string }>({ source: '', target: '' });
    const [pairKey, setPairKey] = useState<string | null>(null);
    const [pairOverrides, setPairOverrides] = useState<Record<string, { source: string; target: string }>>({});
    const [defaultPair, setDefaultPair] = useState<{ source: string; target: string }>({
        source: '/Users/kyawhtet/Desktop/#Input',
        target: '/Users/kyawhtet/Desktop/#Output'
    });
    const [sourceStatus, setSourceStatus] = useState<{ exists: boolean | null; error?: string }>({ exists: null });
    const [targetStatus, setTargetStatus] = useState<{ exists: boolean | null; error?: string }>({ exists: null });

    const resolvePair = (key: string, sourceDir: string, targetDir: string) => {
        if (pairOverrides[key]) {
            return pairOverrides[key];
        }
        return { source: sourceDir, target: targetDir };
    };

    const applyQuickPair = (sourceDir: string, targetDir: string, key?: string) => {
        if (key) {
            const resolved = resolvePair(key, sourceDir, targetDir);
            sourceDir = resolved.source;
            targetDir = resolved.target;
        }
        if (quickAssign === 'source') {
            setConfig(prev => ({ ...prev, sourceDir }));
        } else if (quickAssign === 'target') {
            setConfig(prev => ({ ...prev, targetDir }));
        } else {
            setConfig(prev => ({ ...prev, sourceDir, targetDir }));
        }
    };

    const isPairActive = (sourceDir: string, targetDir: string) =>
        config.sourceDir === sourceDir && config.targetDir === targetDir;

    const openPairModal = (sourceDir: string, targetDir: string, key: string) => {
        const override = pairOverrides[key];
        setPairDraft({ source: override?.source || sourceDir, target: override?.target || targetDir });
        setPairKey(key);
        setIsPairModalOpen(true);
    };

    useEffect(() => {
        const loadData = async () => {
            const overrides = await pipelineApi.getPresetOverrides();
            setPairOverrides(overrides);
            const defaults = await pipelineApi.getDefaults();
            const baseDefault = defaults
                ? { source: `${defaults.desktop}/#Input`, target: `${defaults.desktop}/#Output` }
                : { source: '/Users/kyawhtet/Desktop/#Input', target: '/Users/kyawhtet/Desktop/#Output' };
            const overrideDefault = overrides['default'];
            setDefaultPair(overrideDefault || baseDefault);

            if (!config.sourceDir && !config.targetDir) {
                const resolved = overrideDefault || baseDefault;
                setConfig(prev => ({ ...prev, sourceDir: resolved.source, targetDir: resolved.target }));
                return;
            }

            if (
                overrideDefault &&
                config.sourceDir === baseDefault.source &&
                config.targetDir === baseDefault.target &&
                (overrideDefault.source !== baseDefault.source || overrideDefault.target !== baseDefault.target)
            ) {
                setConfig(prev => ({ ...prev, sourceDir: overrideDefault.source, targetDir: overrideDefault.target }));
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        let cancelled = false;
        const check = async () => {
            if (!config.sourceDir) {
                setSourceStatus({ exists: null });
                return;
            }
            const res = await pipelineApi.scanPath(config.sourceDir, 1);
            if (!cancelled) {
                setSourceStatus({ exists: res.exists, error: res.error });
            }
        };
        check();
        return () => { cancelled = true; };
    }, [config.sourceDir]);

    useEffect(() => {
        let cancelled = false;
        const check = async () => {
            if (!config.targetDir) {
                setTargetStatus({ exists: null });
                return;
            }
            const res = await pipelineApi.scanPath(config.targetDir, 1);
            if (!cancelled) {
                setTargetStatus({ exists: res.exists, error: res.error });
            }
        };
        check();
        return () => { cancelled = true; };
    }, [config.targetDir]);

    // Helper to get presets for current category
    const getCategoryPresets = () => {
        switch (activeCategory) {
            case 'Featured': return [];
            case 'Lifestyle': return ['google-photos', 'minimalist', 'pcloud'];
            case 'Productivity': return ['developer', 'detailed-archive'];
            default: return [];
        }
    };
    return (
        <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-[#161618]">
            <div className="p-8 lg:p-12 max-w-5xl mx-auto w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header */}
                <div className="space-y-8 mt-6">

                    <div className="space-y-8">


                        {/* Section: Presets (App Store Style) */}
                        {presets && onApplyPreset && (
                            <div className="space-y-6 mt-6 pb-20">

                                {/* Category Tabs - One Row Selection */}
                                <div className="flex items-center space-x-2 pb-2">
                                    {['Featured', 'Lifestyle', 'Productivity'].map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveCategory(cat as any)}
                                            className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${activeCategory === cat
                                                ? 'bg-white text-black shadow-md'
                                                : 'bg-[#1c1c1e] text-[#8e8e93] hover:bg-[#2c2c2e] hover:text-white border border-white/5'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Filtered Grid */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Insert Directory Cards in 'Featured' Tab */}
                                        {activeCategory === 'Featured' && (
                                            <>
                                                {/* Source Directory Tile */}
                                                <button
                                                    onClick={async () => {
                                                        if ((window as any).electronAPI) {
                                                            const selected = await (window as any).electronAPI.selectFolder();
                                                            if (selected) setConfig(prev => ({ ...prev, sourceDir: selected }));
                                                        } else {
                                                            let newPath = window.prompt("Enter Full Source Path:", config.sourceDir);
                                                            if (newPath) {
                                                                setConfig(prev => ({ ...prev, sourceDir: newPath.trim() }));
                                                            }
                                                        }
                                                    }}
                                                    className={`group relative flex items-start text-left p-4 rounded-[20px] bg-[#1c1c1e] border ${sourceStatus.exists === false ? 'border-[#fa233b]/60' : 'border-white/5 hover:border-white/10'} active:scale-[0.98] transition-all duration-200`}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setQuickAssign(prev => prev === 'source' ? null : 'source');
                                                        }}
                                                        className={`absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center shadow-lg ${quickAssign === 'source'
                                                            ? 'bg-white text-black'
                                                            : 'border-2 border-white/10 text-white/40'
                                                            }`}
                                                        title="Assign quick presets to Source only"
                                                    >
                                                        {quickAssign === 'source' ? (
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                        ) : null}
                                                    </button>
                                                    <div className={`flex-shrink-0 w-12 h-12 rounded-[12px] flex items-center justify-center shadow-lg mr-4 ${config.sourceDir ? 'bg-[#FF453A] text-white' : 'bg-[#2c2c2e] text-[#8e8e93] group-hover:text-white'}`}>
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="text-[14px] font-bold text-white">Source</h4>
                                                        </div>
                                                        <p className="text-[11px] text-[#8e8e93] line-clamp-1 break-all font-mono leading-relaxed">
                                                            {config.sourceDir || "Select Input Folder..."}
                                                        </p>
                                                        {sourceStatus.exists === false && (
                                                            <div className="mt-2 text-[10px] text-[#ff4d5e] font-semibold flex items-center justify-between">
                                                                <span>Path not found</span>
                                                                <div className="flex items-center space-x-2">
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const res = await pipelineApi.createPath(config.sourceDir);
                                                                            if (res.success) {
                                                                                const check = await pipelineApi.scanPath(config.sourceDir, 1);
                                                                                setSourceStatus({ exists: check.exists, error: check.error });
                                                                            }
                                                                        }}
                                                                        className="px-2 py-0.5 rounded bg-[#fa233b]/20 text-[#fa233b] hover:bg-[#fa233b]/30"
                                                                    >
                                                                        Create
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setConfig(prev => ({ ...prev, sourceDir: defaultPair.source }));
                                                                        }}
                                                                        className="px-2 py-0.5 rounded bg-white/10 text-white/70 hover:bg-white/20"
                                                                    >
                                                                        Reset
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Target Directory Tile */}
                                                <button
                                                    onClick={async () => {
                                                        if ((window as any).electronAPI) {
                                                            const selected = await (window as any).electronAPI.selectFolder();
                                                            if (selected) setConfig(prev => ({ ...prev, targetDir: selected }));
                                                        } else {
                                                            let newPath = window.prompt("Enter Full Destination Path:", config.targetDir);
                                                            if (newPath) {
                                                                setConfig(prev => ({ ...prev, targetDir: newPath.trim() }));
                                                            }
                                                        }
                                                    }}
                                                    className={`group relative flex items-start text-left p-4 rounded-[20px] bg-[#1c1c1e] border ${targetStatus.exists === false ? 'border-[#fa233b]/60' : 'border-white/5 hover:border-white/10'} active:scale-[0.98] transition-all duration-200`}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setQuickAssign(prev => prev === 'target' ? null : 'target');
                                                        }}
                                                        className={`absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center shadow-lg ${quickAssign === 'target'
                                                            ? 'bg-white text-black'
                                                            : 'border-2 border-white/10 text-white/40'
                                                            }`}
                                                        title="Assign quick presets to Target only"
                                                    >
                                                        {quickAssign === 'target' ? (
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                        ) : null}
                                                    </button>
                                                    <div className={`flex-shrink-0 w-12 h-12 rounded-[12px] flex items-center justify-center shadow-lg mr-4 ${config.targetDir ? 'bg-[#FF453A] text-white' : 'bg-[#2c2c2e] text-[#8e8e93] group-hover:text-white'}`}>
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="text-[14px] font-bold text-white">Target</h4>
                                                        </div>
                                                        <p className="text-[11px] text-[#8e8e93] line-clamp-1 break-all font-mono leading-relaxed">
                                                            {config.targetDir || "Select Output Folder..."}
                                                        </p>
                                                        {targetStatus.exists === false && (
                                                            <div className="mt-2 text-[10px] text-[#ff4d5e] font-semibold flex items-center justify-between">
                                                                <span>Path not found</span>
                                                                <div className="flex items-center space-x-2">
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const res = await pipelineApi.createPath(config.targetDir);
                                                                            if (res.success) {
                                                                                const check = await pipelineApi.scanPath(config.targetDir, 1);
                                                                                setTargetStatus({ exists: check.exists, error: check.error });
                                                                            }
                                                                        }}
                                                                        className="px-2 py-0.5 rounded bg-[#fa233b]/20 text-[#fa233b] hover:bg-[#fa233b]/30"
                                                                    >
                                                                        Create
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setConfig(prev => ({ ...prev, targetDir: defaultPair.target }));
                                                                        }}
                                                                        className="px-2 py-0.5 rounded bg-white/10 text-white/70 hover:bg-white/20"
                                                                    >
                                                                        Reset
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            </>

                                        )}


                                        {/* Quick Pair Buttons (Demo) */}
                                        {activeCategory === 'Featured' && (
                                            <>
                                                <button
                                                    onClick={() => applyQuickPair('/Users/kyawhtet/Desktop/#Input', '/Users/kyawhtet/Desktop/#Output', 'default')}
                                                    onDoubleClick={() => openPairModal('/Users/kyawhtet/Desktop/#Input', '/Users/kyawhtet/Desktop/#Output', 'default')}
                                                    className="group relative flex items-start text-left p-4 rounded-[20px] bg-[#1c1c1e] border border-white/5 hover:border-white/10 active:scale-[0.98] transition-all duration-200"
                                                >
                                                    <div className="absolute top-4 right-4">
                                                        {(() => {
                                                            const resolved = resolvePair('default', '/Users/kyawhtet/Desktop/#Input', '/Users/kyawhtet/Desktop/#Output');
                                                            return isPairActive(resolved.source, resolved.target);
                                                        })() ? (
                                                            <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border-2 border-white/10" />
                                                        )}
                                                    </div>
                                                    <div className={`flex-shrink-0 w-12 h-12 rounded-[12px] flex items-center justify-center shadow-lg mr-4 bg-[#FF9F0A] text-white`}>
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="text-[14px] font-bold text-white">Default</h4>
                                                        </div>
                                                        <p className="text-[11px] text-[#8e8e93] line-clamp-1 leading-relaxed">
                                                            #Input → #Output
                                                        </p>
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => applyQuickPair('/Users/kyawhtet/Desktop', '/Users/kyawhtet/Pictures/PhotoSorter_Output', 'desktop')}
                                                    onDoubleClick={() => openPairModal('/Users/kyawhtet/Desktop', '/Users/kyawhtet/Pictures/PhotoSorter_Output', 'desktop')}
                                                    className="group relative flex items-start text-left p-4 rounded-[20px] bg-[#1c1c1e] border border-white/5 hover:border-white/10 active:scale-[0.98] transition-all duration-200"
                                                >
                                                    <div className="absolute top-4 right-4">
                                                        {(() => {
                                                            const resolved = resolvePair('desktop', '/Users/kyawhtet/Desktop', '/Users/kyawhtet/Pictures/PhotoSorter_Output');
                                                            return isPairActive(resolved.source, resolved.target);
                                                        })() ? (
                                                            <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border-2 border-white/10" />
                                                        )}
                                                    </div>
                                                    <div className={`flex-shrink-0 w-12 h-12 rounded-[12px] flex items-center justify-center shadow-lg mr-4 bg-[#32D74B] text-white`}>
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="text-[14px] font-bold text-white">Clean Desktop</h4>
                                                        </div>
                                                        <p className="text-[11px] text-[#8e8e93] line-clamp-1 leading-relaxed">
                                                            Desktop → Pictures
                                                        </p>
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => applyQuickPair('/Users/kyawhtet/Downloads', '/Users/kyawhtet/Pictures/PhotoSorter_Output', 'downloads')}
                                                    onDoubleClick={() => openPairModal('/Users/kyawhtet/Downloads', '/Users/kyawhtet/Pictures/PhotoSorter_Output', 'downloads')}
                                                    className="group relative flex items-start text-left p-4 rounded-[20px] bg-[#1c1c1e] border border-white/5 hover:border-white/10 active:scale-[0.98] transition-all duration-200"
                                                >
                                                    <div className="absolute top-4 right-4">
                                                        {(() => {
                                                            const resolved = resolvePair('downloads', '/Users/kyawhtet/Downloads', '/Users/kyawhtet/Pictures/PhotoSorter_Output');
                                                            return isPairActive(resolved.source, resolved.target);
                                                        })() ? (
                                                            <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border-2 border-white/10" />
                                                        )}
                                                    </div>
                                                    <div className={`flex-shrink-0 w-12 h-12 rounded-[12px] flex items-center justify-center shadow-lg mr-4 bg-[#30B0C7] text-white`}>
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="text-[14px] font-bold text-white">Sort Downloads</h4>
                                                        </div>
                                                        <p className="text-[11px] text-[#8e8e93] line-clamp-1 leading-relaxed">
                                                            Downloads → Pictures
                                                        </p>
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => applyQuickPair('/Users/kyawhtet/Documents', '/Users/kyawhtet/Documents/Sorted', 'documents')}
                                                    onDoubleClick={() => openPairModal('/Users/kyawhtet/Documents', '/Users/kyawhtet/Documents/Sorted', 'documents')}
                                                    className="group relative flex items-start text-left p-4 rounded-[20px] bg-[#1c1c1e] border border-white/5 hover:border-white/10 active:scale-[0.98] transition-all duration-200"
                                                >
                                                    <div className="absolute top-4 right-4">
                                                        {(() => {
                                                            const resolved = resolvePair('documents', '/Users/kyawhtet/Documents', '/Users/kyawhtet/Documents/Sorted');
                                                            return isPairActive(resolved.source, resolved.target);
                                                        })() ? (
                                                            <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border-2 border-white/10" />
                                                        )}
                                                    </div>
                                                    <div className={`flex-shrink-0 w-12 h-12 rounded-[12px] flex items-center justify-center shadow-lg mr-4 bg-[#0A84FF] text-white`}>
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h4l2-2h6l2 2h4v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"></path>
                                                            <circle cx="12" cy="13" r="3.5" strokeWidth="2"></circle>
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="text-[14px] font-bold text-white">Group Photos</h4>
                                                        </div>
                                                        <p className="text-[11px] text-[#8e8e93] line-clamp-1 leading-relaxed">
                                                            Documents → Sorted
                                                        </p>
                                                    </div>
                                                </button>
                                            </>
                                        )}

                                        {presets.filter(p => getCategoryPresets().includes(p.id)).map(preset => {
                                            const isActive = activePresetId === preset.id;
                                            return (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => {
                                                        if (isActive) {
                                                            const nonePreset = presets.find(p => p.id === 'none');
                                                            if (nonePreset) onApplyPreset(nonePreset);
                                                        } else {
                                                            onApplyPreset(preset);
                                                            const override = pairOverrides[preset.id];
                                                            if (override) {
                                                                setConfig(prev => ({
                                                                    ...prev,
                                                                    sourceDir: override.source,
                                                                    targetDir: override.target
                                                                }));
                                                            }
                                                        }
                                                    }}
                                                    onDoubleClick={() => openPairModal(
                                                        config.sourceDir || '/Users/kyawhtet/Desktop/#Input',
                                                        config.targetDir || '/Users/kyawhtet/Desktop/#Output',
                                                        preset.id
                                                    )}
                                                    className={`group relative flex items-start text-left p-4 rounded-[20px] transition-all duration-200 overflow-visible active:scale-[0.98] outline-none focus:outline-none focus:ring-0 ring-0 border ${isActive
                                                        ? 'bg-[#242426] shadow-2xl z-10 border-transparent'
                                                        : 'bg-[#1c1c1e] border-white/5'
                                                        }`}
                                                >
                                                    <div
                                                        className={`flex-shrink-0 w-12 h-12 rounded-[12px] flex items-center justify-center shadow-lg mr-4`}
                                                        style={{ backgroundColor: preset.color || '#3a3a3c' }}
                                                    >
                                                        <div className={preset.color === '#FFFFFF' ? 'text-black' : 'text-white'}>
                                                            {React.cloneElement(preset.icon as React.ReactElement, { className: "w-6 h-6" })}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-6">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className={`text-[14px] font-bold ${isActive ? 'text-white' : 'text-[#e5e5e5]'}`}>
                                                                {preset.name}
                                                            </h4>
                                                        </div>
                                                        <p className={`text-[11px] leading-relaxed line-clamp-1 ${isActive ? 'text-gray-300' : 'text-[#8e8e93]'}`}>
                                                            {preset.description}
                                                        </p>
                                                    </div>
                                                    <div className="absolute top-4 right-4">
                                                        {isActive ? (
                                                            <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border-2 border-white/10" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Continue Button */}


                </div>
            </div>
            {isPairModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm z-0"
                        onClick={() => setIsPairModalOpen(false)}
                    />
                    <div
                        className="relative z-[1] w-[520px] rounded-2xl bg-[#1c1c1e] border border-white/10 shadow-2xl p-6 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[13px] font-bold text-white">Edit Preset Paths</h3>
                            <button
                                onClick={() => setIsPairModalOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[#86868b] hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] uppercase tracking-wider text-[#8e8e93] font-bold">Source</label>
                                <input
                                    value={pairDraft.source}
                                    onChange={(e) => setPairDraft(prev => ({ ...prev, source: e.target.value }))}
                                    className="mt-2 w-full bg-[#2c2c2e] text-white text-[12px] font-mono px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#fa233b]"
                                    placeholder="/Users/kyawhtet/Desktop"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] uppercase tracking-wider text-[#8e8e93] font-bold">Target</label>
                                <input
                                    value={pairDraft.target}
                                    onChange={(e) => setPairDraft(prev => ({ ...prev, target: e.target.value }))}
                                    className="mt-2 w-full bg-[#2c2c2e] text-white text-[12px] font-mono px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#fa233b]"
                                    placeholder="/Users/kyawhtet/Desktop/#Output"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={async () => {
                                    const nextSource = pairDraft.source.trim();
                                    const nextTarget = pairDraft.target.trim();
                                    if (!nextSource || !nextTarget) {
                                        return;
                                    }
                                    const key = pairKey || 'default';
                                    setPairOverrides(prev => ({
                                        ...prev,
                                        [key]: { source: nextSource, target: nextTarget }
                                    }));
                                    // Save in background so UI doesn't require a second click
                                    void pipelineApi.setPresetOverride(key, nextSource, nextTarget);
                                    setConfig(prev => ({
                                        ...prev,
                                        sourceDir: nextSource,
                                        targetDir: nextTarget
                                    }));
                                    setIsPairModalOpen(false);
                                }}
                                className="px-4 py-2 rounded-lg text-[12px] font-bold shadow-lg shadow-[#fa233b]/20 bg-[#fa233b] hover:bg-[#ff3b53] text-white"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
};


