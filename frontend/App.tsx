
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { INITIAL_STEPS } from './constants';
import { StepId, PipelineStep, PipelineStatus, PipelineConfig, FileCategory, PipelinePreset } from './types';
import { ResultsTable } from './components/ResultsTable';
import { SidebarItem } from './components/SidebarItem';
import { PipelineSummary } from './components/PipelineSummary';
import { Setup } from './components/Setup';
import { SettingsModal } from './components/SettingsModal';
import { pipelineApi } from './services/api';
import { Preview } from './components/Preview';

const STEP_RULES: Record<StepId, string[]> = {
  [StepId.SETUP]: ["Configure the pipeline settings."],
  [StepId.PREVIEW]: ["Review content of the source folder."],
  [StepId.SUMMARY]: ["Review the total transformation sequence."],
  [StepId.STANDARDIZE]: [
    "Folder: 1993-07-12 4-52-24AM ➔ 1993-07-12 4-52-24AM_000001.jpg",
    "Flattens files to source root",
    "Updates Metadata (EXIF) from Folder Timestamp"
  ],
  [StepId.DEDUPLICATE]: [
    "abc (1).jpg ➔ abc.jpg",
    "Copy of abc.jpg ➔ abc.jpg"
  ],
  [StepId.FILENAME]: [
    "Prefix: 1993-07-12_...",
    "Body: ..._photo_vacation...",
    "Extension: ... .jpg"
  ],
  [StepId.GROUP]: [
    "Supports YYYY-MM-DD (Time Optional)",
    "Metadata Fallback ➔ 1993 / 07"
  ],
  [StepId.TRANSFER]: [
    "Source / ... / file.jpg ➔ Target / ... / file.jpg",
    "Mirrors Source Structure",
    "Auto-cleanup Empty Folders"
  ],
};

// --- PRESETS DEFINITIONS ---
const PRESETS: import('./types').PipelinePreset[] = [
  {
    id: 'none',
    name: 'None (Manual)',
    description: 'Start with no rules. Manually configure every step.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>,
    color: '#FF453A',
    configUpdates: {
      prefix: { add_timestamp: false, timeline_mode: 'off' },
      timestamp_format: { preset: 'pcloud', hour_format_12: true },
      rename: { replace_bodyname: "", append_first_text: "", append_second_text: "" },
      extension: { clean_extensions: true, uniform_extensions: false },
      deduplicate: { mode: 'safe' }
    },
    stepUpdates: {
      [StepId.DEDUPLICATE]: true,
      [StepId.FILENAME]: true,
      [StepId.GROUP]: true,
      [StepId.TRANSFER]: true
    }
  },
  {
    id: 'pcloud',
    name: 'pCloud',
    description: 'Rename by time + filename, organize by year and month.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>,
    color: '#0091FF',
    configUpdates: {
      prefix: { add_timestamp: true, timeline_mode: 'timeline_plus' },
      timestamp_format: { preset: 'pcloud', hour_format_12: true },
      rename: { replace_bodyname: "", append_first_text: "", append_second_text: "" },
      extension: { clean_extensions: true, uniform_extensions: false },
      deduplicate: { mode: 'safe' },
      group: { prioritize_filename: false }
    },
    stepUpdates: {
      [StepId.STANDARDIZE]: false,
      [StepId.DEDUPLICATE]: true,
      [StepId.FILENAME]: true,
      [StepId.GROUP]: true,
      [StepId.TRANSFER]: false
    }
  },
  {
    id: 'google-photos',
    name: 'Google Photos',
    description: 'Organize photos by year and month.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>,
    color: '#FF9F0A',
    configUpdates: {
      fileCategory: 'photos',
      prefix: { add_timestamp: false, timeline_mode: 'off' },
      timestamp_format: { preset: 'google_photos', hour_format_12: false },
      rename: { replace_bodyname: "", append_first_text: "", append_second_text: "" },
      extension: { clean_extensions: true, uniform_extensions: false },
      deduplicate: { mode: 'safe' },
      group: { prioritize_filename: false }
    },
    stepUpdates: {
      [StepId.STANDARDIZE]: false,
      [StepId.DEDUPLICATE]: true,
      [StepId.FILENAME]: true,
      [StepId.GROUP]: true,
      [StepId.TRANSFER]: false
    }
  },
  {
    id: 'minimalist',
    name: 'pCloud Automatic',
    description: 'Rename by time, organize by year and month.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>,
    color: '#27c5d6',
    configUpdates: {
      prefix: { add_timestamp: true, timeline_mode: 'timeline_plus' },
      timestamp_format: { preset: 'pcloud', hour_format_12: true },
      rename: { replace_bodyname: "", append_first_text: "", append_second_text: "" },
      extension: { clean_extensions: true, uniform_extensions: false },
      deduplicate: { mode: 'safe' },
      group: { prioritize_filename: false }
    },
    stepUpdates: {
      [StepId.STANDARDIZE]: false,
      [StepId.DEDUPLICATE]: true,
      [StepId.FILENAME]: true,
      [StepId.GROUP]: true,
      [StepId.TRANSFER]: false
    }
  }
];

const EXTENSIONS: Record<string, string[]> = {
  photos: ['.jpg', '.jpeg', '.png', '.heic', '.gif', '.webp', '.tiff', '.bmp', '.raw', '.svg'],
  video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
  docs: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.md'],
  code: ['.py', '.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.json', '.yaml', '.yml', '.sh', '.sql', '.c', '.cpp', '.h', '.java', '.go', '.rs', '.php']
};

type SavedLogicPresetData = {
  configUpdates: Partial<PipelineConfig>;
  stepUpdates: Partial<Record<StepId, boolean>>;
  description: string;
};

const App: React.FC = () => {
  const STORAGE_CONFIG_KEY = 'file_organizer_config_v1';
  const STORAGE_PRESET_KEY = 'file_organizer_preset_v1';
  const STORAGE_SAVED_LOGIC_KEY = 'file_organizer_saved_logic_v1';
  const normalizeDeduplicateMode = (deduplicate: any): 'safe' | 'smart' =>
    deduplicate?.mode === 'smart' ? 'smart' : 'safe';

  const loadStoredConfig = (): PipelineConfig | null => {
    try {
      const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PipelineConfig;
      return {
        ...parsed,
        sourceDir: '',
        targetDir: ''
      } as PipelineConfig;
    } catch {
      return null;
    }
  };

  const loadStoredPreset = (): string | null => {
    try {
      return localStorage.getItem(STORAGE_PRESET_KEY);
    } catch {
      return null;
    }
  };

  const loadSavedLogicPreset = (): SavedLogicPresetData | null => {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED_LOGIC_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SavedLogicPresetData;
    } catch {
      return null;
    }
  };

  const [steps, setSteps] = useState<PipelineStep[]>([
    {
      id: StepId.SETUP,
      name: 'Setup',
      description: 'Configure source, target and presets',
      enabled: true,
      status: PipelineStatus.IDLE
    },
    {
      id: StepId.PREVIEW,
      name: 'Preview',
      description: 'Review content of the source folder',
      enabled: true,
      status: PipelineStatus.IDLE
    },
    {
      id: StepId.SUMMARY,
      name: 'Summary',
      description: 'Master overview of the handling sequence',
      enabled: true,
      status: PipelineStatus.IDLE
    },
    ...INITIAL_STEPS
  ]);
  const [activeStepId, setActiveStepId] = useState<StepId>(StepId.SETUP);
  const [activePresetId, setActivePresetId] = useState<string>(() => loadStoredPreset() || 'none');
  const [selectedSetupCardId, setSelectedSetupCardId] = useState<string>(() => {
    const storedPreset = loadStoredPreset();
    return storedPreset && storedPreset !== 'none' ? storedPreset : 'pathway_default';
  });
  const [savedLogicPresetData, setSavedLogicPresetData] = useState<SavedLogicPresetData | null>(() => loadSavedLogicPreset());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [config, setConfig] = useState<PipelineConfig>(() => {
    const stored = loadStoredConfig();
    if (stored) {
      return {
        ...stored,
        sourceDir: stored.sourceDir || '',
        targetDir: stored.targetDir || '',
        fileCategory: stored.fileCategory || 'all',
        deduplicate: { mode: normalizeDeduplicateMode((stored as any).deduplicate) },
        processing_file_limit: stored.processing_file_limit && stored.processing_file_limit > 0 ? stored.processing_file_limit : 500,
      };
    }
    return {
      sourceDir: '',
      targetDir: '',
      isDryRun: true,
      fileCategory: 'all',
      timestamp_format: {
        preset: 'pcloud',
        hour_format_12: true
      },
      standardize: {
        use_filename_fallback: false
      },
      metadata: {
        start_datetime: "1993-07-12 04-52-24 AM",
        add_timestamp: true,
        keep_original_name: false
      },
      deduplicate: {
        mode: 'safe'
      },
      prefix: {
        add_timestamp: true,
        timeline_mode: 'timeline_plus'
      },
      extension: {
        clean_extensions: true,
        uniform_extensions: true
      },
      rename: {
        replace_bodyname: "",
        append_first_text: "",
        append_second_text: ""
      },
      group: {
        prioritize_filename: true
      },
      transfer: {
        overwrite: false
      },
      processing_file_limit: 500,
      max_preview_files: 100
    };
  });
  const [showCounts, setShowCounts] = useState(true);
  const [pathCounts, setPathCounts] = useState<{
    source: { count: number; exists: boolean };
    target: { count: number; exists: boolean };
  }>({
    source: { count: 0, exists: true },
    target: { count: 0, exists: true }
  });
  const [scanRefreshKey, setScanRefreshKey] = useState(0);
  const scanCacheRef = React.useRef<Map<string, { count: number; exists: boolean; timestamp: number }>>(new Map());
  const scanControllersRef = React.useRef<{
    sourceFast?: AbortController;
    sourceFull?: AbortController;
    targetFast?: AbortController;
    targetFull?: AbortController;
  }>({});
  const [canUndo, setCanUndo] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [clientError, setClientError] = useState<{
    message: string;
    stack?: string;
    source?: string;
    timestamp: string;
  } | null>(null);
  const [clientErrorReported, setClientErrorReported] = useState(false);
  const [backendStatus, setBackendStatus] = useState<{
    state: 'checking' | 'ok' | 'error';
    message?: string;
  }>({ state: 'checking' });

  const checkBackend = useCallback(async () => {
    setBackendStatus({ state: 'checking' });
    const res = await pipelineApi.health();
    if (res.ok) {
      setBackendStatus({ state: 'ok' });
    } else {
      setBackendStatus({ state: 'error', message: res.error || 'Unknown error' });
    }
  }, []);

  const checkBackendWithRetries = useCallback(async (attempts: number, delayMs: number) => {
    for (let i = 0; i < attempts; i++) {
      const res = await pipelineApi.health();
      if (res.ok) {
        setBackendStatus({ state: 'ok' });
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    setBackendStatus({ state: 'error', message: 'Backend did not become ready' });
    return false;
  }, []);

  const forceRefreshPathCounts = useCallback(async () => {
    const updates: Partial<typeof pathCounts> = {};

    if (config.sourceDir) {
      const sourceRes = await pipelineApi.scanPath(config.sourceDir, config.fileCategory);
      updates.source = { count: sourceRes.count, exists: sourceRes.exists };
    }

    if (config.targetDir) {
      const targetRes = await pipelineApi.scanPath(config.targetDir, 'all');
      updates.target = { count: targetRes.count, exists: targetRes.exists };
    }

    if (Object.keys(updates).length > 0) {
      setPathCounts(prev => ({ ...prev, ...updates }));
    }
  }, [config.sourceDir, config.targetDir, config.fileCategory]);

  // Start the bundled backend sidecar in the Tauri app
  React.useEffect(() => {
    const startBackend = async () => {
      if (!(window as any)?.__TAURI__) return;
      try {
        const { Command } = await import('@tauri-apps/plugin-shell');
        await Command.sidecar('file-organizer-backend').spawn();
        await checkBackendWithRetries(10, 500);
      } catch (e) {
        const msg = `Failed to start backend sidecar: ${String(e)}`;
        console.error(msg);
        setBackendStatus({ state: 'error', message: msg });
      }
    };
    startBackend();
  }, []);

  React.useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  // Scan paths when config changes
  React.useEffect(() => {
    const FAST_LIMIT = 5000;
    const CACHE_TTL_MS = 15000;

    const updateCounts = (key: 'source' | 'target', data: { count: number; exists: boolean }) => {
      setPathCounts(prev => ({ ...prev, [key]: data }));
    };

    const runScan = (key: 'source' | 'target', path?: string, category: FileCategory = 'all') => {
      if (!path) {
        updateCounts(key, { count: 0, exists: true });
        return;
      }

      const cacheKey = `${key}:${category}:${path}`;
      const cached = scanCacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        updateCounts(key, { count: cached.count, exists: cached.exists });
      }

      const controllerKeyFast = key === 'source' ? 'sourceFast' : 'targetFast';
      const controllerKeyFull = key === 'source' ? 'sourceFull' : 'targetFull';
      scanControllersRef.current[controllerKeyFast]?.abort();
      scanControllersRef.current[controllerKeyFull]?.abort();

      const fastController = new AbortController();
      scanControllersRef.current[controllerKeyFast] = fastController;

      pipelineApi.scanPath(path, category, FAST_LIMIT, fastController.signal)
        .then(res => {
          if (fastController.signal.aborted) return;
          updateCounts(key, { count: res.count, exists: res.exists });
          scanCacheRef.current.set(cacheKey, { count: res.count, exists: res.exists, timestamp: Date.now() });

          if (res.truncated) {
            const fullController = new AbortController();
            scanControllersRef.current[controllerKeyFull] = fullController;
            pipelineApi.scanPath(path, category, undefined, fullController.signal)
              .then(fullRes => {
                if (fullController.signal.aborted) return;
                if ((key === 'source' && config.sourceDir !== path) || (key === 'target' && config.targetDir !== path)) {
                  return;
                }
                updateCounts(key, { count: fullRes.count, exists: fullRes.exists });
                scanCacheRef.current.set(cacheKey, { count: fullRes.count, exists: fullRes.exists, timestamp: Date.now() });
              })
              .catch(err => {
                if (err?.name !== 'AbortError') {
                  // ignore errors for background refine
                }
              });
          }
        })
        .catch(err => {
          if (err?.name !== 'AbortError') {
            updateCounts(key, { count: 0, exists: false });
          }
        });
    };

    runScan('source', config.sourceDir, config.fileCategory);
    runScan('target', config.targetDir, 'all');
  }, [config.sourceDir, config.targetDir, config.fileCategory, scanRefreshKey]);

  const activeStep = useMemo(() =>
    steps.find(s => s.id === activeStepId) || steps[0],
    [steps, activeStepId]
  );

  const fileStats = useMemo(() => {
    const uniqueFiles = new Set<string>();
    const stats = { all: 0, photos: 0, video: 0, audio: 0, docs: 0, code: 0, others: 0 };

    steps.forEach(step => {
      if (step.results && step.results.length > 0) {
        step.results.forEach(res => {
          if (!uniqueFiles.has(res.original)) {
            uniqueFiles.add(res.original);
            stats.all++;

            const ext = '.' + res.original.split('.').pop()?.toLowerCase();
            let matched = false;
            for (const [cat, exts] of Object.entries(EXTENSIONS)) {
              if ((exts as string[]).includes(ext || '')) {
                stats[cat as keyof typeof stats]++;
                matched = true;
                break;
              }
            }
            if (!matched) stats.others++;
          }
        });
      }
    });
    return stats;
  }, [steps]);

  const updateStepStatus = useCallback((id: StepId, status: PipelineStatus, results?: any[], error?: string) => {
    setSteps(prev => prev.map(s =>
      s.id === id ? { ...s, status, results, error } : s
    ));
  }, []);

  const handleToggleStep = (id: StepId) => {
    setSteps(prev => prev.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const handleRunStep = async (id: StepId) => {
    if (!config.sourceDir) return;
    updateStepStatus(id, PipelineStatus.RUNNING);
    try {
      const result = await pipelineApi.runStep({ step_id: id, config });
      if (result.success) {
        updateStepStatus(id, PipelineStatus.SUCCESS, result.processed_files);
      } else {
        updateStepStatus(id, PipelineStatus.ERROR, undefined, result.error);
      }
    } catch (e) {
      updateStepStatus(id, PipelineStatus.ERROR, undefined, String(e));
    }
    // Check if undo is now available
    checkUndoAvailability();
  };

  const handleProcessAll = async () => {
    if (!config.sourceDir) return;

    // 1. Identify enabled vs disabled steps
    const stepsToRun = steps.filter(s => s.enabled && s.id !== StepId.SUMMARY && s.id !== StepId.SETUP && s.id !== StepId.PREVIEW).map(s => s.id);
    const stepsToClear = steps.filter(s => !s.enabled && s.id !== StepId.SUMMARY && s.id !== StepId.SETUP).map(s => s.id);

    // 2. Clear disabled steps
    setSteps(prev => prev.map(s => {
      if (stepsToClear.includes(s.id)) {
        return { ...s, results: [], status: PipelineStatus.IDLE };
      }
      return s;
    }));

    if (stepsToRun.length === 0) return;

    // 3. Show sequential-style loading in UI (backend runs sequentially in a single request)
    const firstStepId = stepsToRun[0];
    setSteps(prev => prev.map(s => {
      if (!stepsToRun.includes(s.id)) return s;
      return {
        ...s,
        status: s.id === firstStepId ? PipelineStatus.RUNNING : PipelineStatus.IDLE
      };
    }));

    // 4. Run all enabled steps in one backend call (single undo entry)
    const responses = await pipelineApi.runAll({ steps: stepsToRun, config });
    if (!responses || responses.length === 0) {
      setSteps(prev => prev.map(s => (
        stepsToRun.includes(s.id)
          ? { ...s, status: PipelineStatus.ERROR, error: 'Batch run failed' }
          : s
      )));
      return;
    }

    // 5. Apply results
    setSteps(prev => prev.map(s => {
      const res = responses.find(r => r.step_id === s.id);
      if (!res) return s;
      return res.success
        ? { ...s, status: PipelineStatus.SUCCESS, results: res.processed_files, error: undefined }
        : { ...s, status: PipelineStatus.ERROR, results: [], error: res.error || 'Step failed' };
    }));

    // 6. Check if undo is available
    checkUndoAvailability();
  };

  const handleUndo = async () => {
    const result = await pipelineApi.undo();
    if (result.success) {
      alert(`✅ Undone ${result.undone_count} changes!\n${result.message}`);
      // Clear all step results since files have been reverted
      setSteps(prev => prev.map(s => ({
        ...s,
        results: [],
        status: PipelineStatus.IDLE
      })));
      checkUndoAvailability();
    } else {
      alert(`❌ Undo failed: ${result.message}`);
    }
  };

  const checkUndoAvailability = async () => {
    const history = await pipelineApi.getUndoHistory();
    const canUndoNow = history.length > 0;
    setCanUndo(canUndoNow);
  };

  // Check undo availability on mount
  React.useEffect(() => {
    void checkUndoAvailability();
  }, []);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setClientError({
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        source: event.filename,
        timestamp: new Date().toISOString()
      });
      setClientErrorReported(false);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      setClientError({
        message: typeof reason === 'string' ? reason : (reason?.message || 'Unhandled promise rejection'),
        stack: reason?.stack,
        source: 'unhandledrejection',
        timestamp: new Date().toISOString()
      });
      setClientErrorReported(false);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  React.useEffect(() => {
    try {
      const persistedConfig = {
        ...config,
        sourceDir: '',
        targetDir: ''
      };
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(persistedConfig));
    } catch {
      // ignore storage errors
    }
  }, [config]);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PRESET_KEY, activePresetId);
    } catch {
      // ignore storage errors
    }
  }, [activePresetId]);

  React.useEffect(() => {
    try {
      if (!savedLogicPresetData) {
        localStorage.removeItem(STORAGE_SAVED_LOGIC_KEY);
      } else {
        localStorage.setItem(STORAGE_SAVED_LOGIC_KEY, JSON.stringify(savedLogicPresetData));
      }
    } catch {
      // ignore storage errors
    }
  }, [savedLogicPresetData]);

  const savedLogicPreset = useMemo<PipelinePreset | null>(() => {
    if (!savedLogicPresetData) return null;
    return {
      id: 'saved-current-logic',
      name: 'Saved Current Logic',
      description: savedLogicPresetData.description,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>,
      color: '#34C759',
      configUpdates: savedLogicPresetData.configUpdates,
      stepUpdates: savedLogicPresetData.stepUpdates,
    };
  }, [savedLogicPresetData]);

  const availablePresets = useMemo<PipelinePreset[]>(
    () => (savedLogicPreset ? [...PRESETS, savedLogicPreset] : PRESETS),
    [savedLogicPreset]
  );

  const handleApplyPreset = (preset: PipelinePreset) => {
    // 1. Update Config
    setConfig(prev => ({
      ...prev,
      ...preset.configUpdates,
      timestamp_format: { ...prev.timestamp_format, ...(preset.configUpdates.timestamp_format || {}) },
      standardize: { ...prev.standardize, ...(preset.configUpdates.standardize || {}) },
      metadata: { ...prev.metadata, ...(preset.configUpdates.metadata || {}) },
      prefix: { ...prev.prefix, ...(preset.configUpdates.prefix || {}) },
      rename: { ...prev.rename, ...(preset.configUpdates.rename || {}) },
      extension: { ...prev.extension, ...(preset.configUpdates.extension || {}) },
      deduplicate: { ...prev.deduplicate, ...(preset.configUpdates.deduplicate || {}) },
      group: { ...prev.group, ...(preset.configUpdates.group || {}) },
      transfer: { ...prev.transfer, ...(preset.configUpdates.transfer || {}) },
    }));

    // 2. Update Step Enable/Disable states
    setSteps(prev => prev.map(step => {
      // If preset defines a state for this step, use it. Otherwise keep current.
      if (step.id in preset.stepUpdates) {
        return { ...step, enabled: preset.stepUpdates[step.id]!, status: PipelineStatus.IDLE, results: [] };
      }
      return step;
    }));

    // 3. Track active preset
    setActivePresetId(preset.id);
  };

  const handleSaveCurrentLogic = useCallback(() => {
    const logicConfig: Partial<PipelineConfig> = {
      fileCategory: config.fileCategory,
      timestamp_format: { ...config.timestamp_format },
      standardize: { ...config.standardize },
      metadata: { ...config.metadata },
      deduplicate: { ...config.deduplicate },
      prefix: { ...config.prefix },
      extension: { ...config.extension },
      rename: { ...config.rename },
      group: { ...config.group },
      transfer: { ...config.transfer },
      processing_file_limit: config.processing_file_limit,
      max_preview_files: config.max_preview_files,
    };

    const logicSteps: Partial<Record<StepId, boolean>> = {};
    steps
      .filter(step => step.id !== StepId.SETUP && step.id !== StepId.PREVIEW && step.id !== StepId.SUMMARY)
      .forEach(step => {
        logicSteps[step.id] = step.enabled;
      });

    setSavedLogicPresetData({
      configUpdates: logicConfig,
      stepUpdates: logicSteps,
      description: `Saved manual logic (${new Date().toLocaleString()})`,
    });
    setActivePresetId('saved-current-logic');
  }, [config, steps]);

  const handleUseSavedLogic = useCallback(() => {
    const preset = savedLogicPreset;
    if (!preset) return;
    handleApplyPreset(preset);
  }, [savedLogicPreset]);

  const handleSelectSetupCard = useCallback((cardId: string) => {
    setSelectedSetupCardId(cardId);
    if (cardId.startsWith('pathway_')) {
      // Pathway cards are path selectors, not logic presets.
      setActivePresetId('none');
    }
  }, []);

  const categories: { id: FileCategory, label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'docs', label: 'Docs' },
    { id: 'photos', label: 'Photo' },
    { id: 'audio', label: 'Audio' },
    { id: 'video', label: 'Video' },
    { id: 'code', label: 'Code' },
    { id: 'others', label: 'Other' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full select-none pt-10 pb-6">
      <div className="mb-8 px-6 flex items-center space-x-3">
        <div className="p-1.5 bg-[#fa233b] rounded-md shadow-md shadow-[#fa233b]/20">
          <svg className="w-4 h-4 text-white fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
        </div>
        <div className="flex-1 flex items-center justify-between">
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-bold tracking-tight text-white hover:text-[#fa233b] transition-colors cursor-pointer"
          >
            File Organizer
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-6">
        {/* Section 0: Setup & Preview */}
        <div>
          <div className="space-y-1">
            {steps
              .filter(step => step.id === StepId.SETUP)
              .map(step => (
                <SidebarItem
                  key={step.id}
                  step={step}
                  isActive={activeStepId === step.id}
                  onSelect={(id) => { setActiveStepId(id); setIsSidebarOpen(false); }}
                />
              ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 mx-3 my-4"></div>

        {/* Section 1: Processing Steps */}
        <div className="flex-1">
          <div className="space-y-1">
            {steps
              .filter(step => step.id !== StepId.SETUP && step.id !== StepId.SUMMARY)
              .map(step => (
                <React.Fragment key={step.id}>
                  <SidebarItem
                    step={step}
                    isActive={activeStepId === step.id}
                    onSelect={(id) => { setActiveStepId(id); setIsSidebarOpen(false); }}
                    onToggle={step.id === StepId.PREVIEW ? undefined : handleToggleStep}
                    count={step.id === StepId.PREVIEW || showCounts ? step.results?.length : undefined}
                    disabled={activePresetId !== 'none' && step.id !== StepId.PREVIEW}
                    rightContent={step.id === StepId.PREVIEW && config.sourceDir ? (
                      <span className="text-[12px] font-mono font-bold px-2 py-0.5 rounded-lg bg-white/20 text-white leading-none flex items-center h-5">
                        {pathCounts.source.count >= 5000 ? '5000+' : pathCounts.source.count}
                      </span>
                    ) : undefined}
                  />
                  {step.id === StepId.STANDARDIZE && (
                    <div className="h-px bg-white/5 mx-3 my-5" />
                  )}
                </React.Fragment>
              ))}
          </div>
        </div>

        {/* Section 2: Summary (Result) */}
        <div>
          <div className="space-y-1 mt-6">
            <div className="h-px bg-white/5 mx-3 mb-2"></div>
            {steps
              .filter(step => step.id === StepId.SUMMARY)
              .map(step => (
                <SidebarItem
                  key={step.id}
                  step={step}
                  isActive={activeStepId === step.id}
                  onSelect={(id) => { setActiveStepId(id); setIsSidebarOpen(false); }}
                  count={fileStats.all}
                />
              ))}
          </div>
        </div>
      </nav>

      {/* Bottom Button Removed */}
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-white">

      <aside className={`w-64 flex-shrink-0 border-r border-black/5 dark:border-white/10 bg-[#ebebeb] dark:bg-[#1c1c1e]/50 glass transition-transform duration-300 ease-out md:static md:translate-x-0 ${isSidebarOpen ? 'fixed inset-y-0 left-0 z-50 translate-x-0' : 'fixed inset-y-0 left-0 z-50 -translate-x-full'
        }`}>
        {sidebarContent}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#161618] inner-shadow">
        {backendStatus.state === 'error' && (
          <div className="px-4 lg:px-6 py-3 border-b border-white/5 bg-[#241a1a] text-[#f4c7c7] flex items-center justify-between">
            <div className="text-[12px] font-mono truncate">
              <span className="font-bold text-[#fa233b] mr-2">Backend Offline:</span>
              {backendStatus.message}
            </div>
            <button
              onClick={checkBackend}
              className="text-[11px] font-bold px-3 py-1 rounded-md bg-[#fa233b] text-white hover:bg-[#fa233b]/90 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        {clientError && (
          <div className="px-4 lg:px-6 py-3 border-b border-white/5 bg-[#2a1b1b] text-[#f4c7c7] flex items-center justify-between">
            <div className="text-[12px] font-mono truncate">
              <span className="font-bold text-[#fa233b] mr-2">App Error:</span>
              {clientError.message}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={async () => {
                  if (clientErrorReported) return;
                  const res = await pipelineApi.logClientError({
                    message: clientError.message,
                    stack: clientError.stack,
                    source: clientError.source,
                    url: window.location.href,
                    user_agent: navigator.userAgent,
                    timestamp: clientError.timestamp
                  });
                  if (res.success) setClientErrorReported(true);
                }}
                className="text-[11px] font-bold px-3 py-1 rounded-md bg-[#fa233b] text-white hover:bg-[#fa233b]/90 transition-colors"
              >
                {clientErrorReported ? 'Reported' : 'Report Error'}
              </button>
              <button
                onClick={() => setClientError(null)}
                className="text-[11px] font-bold px-3 py-1 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-white/5 vibrancy sticky top-0 z-20 draggable">
          <div className="flex items-center space-x-6 flex-1 min-w-0 non-draggable">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-[#fa233b] p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h1 className="text-[14px] font-bold text-white/90 truncate md:hidden">
              {activeStep.name}
            </h1>

            {/* Dynamic Context Bar */}
            <div className="hidden md:flex items-center space-x-3 ml-4 flex-1">
              {/* 1. Preview Box (Icon) */}
              <div className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-[#2c2c2e] border border-white/10 text-white/50 shadow-sm transition-colors duration-300">
                {activeStep.id === StepId.STANDARDIZE ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                ) : activeStep.id === StepId.FILENAME ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                ) : activeStep.id === StepId.TRANSFER || activeStep.id === StepId.GROUP ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                ) : activeStep.id === StepId.SETUP ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                )}
              </div>

              <div className="h-9 px-4 w-full max-w-lg flex items-center bg-[#1c1c1e] border border-white/10 rounded-lg font-mono text-[12px] text-[#8e8e93] overflow-hidden whitespace-nowrap">
                {activeStep.id === StepId.SETUP ? (
                  <span><span className="text-[#fa233b]">Setup:</span> Pipeline configuration</span>
                ) : activeStep.id === StepId.SUMMARY ? (
                  <span><span className="text-[#fa233b]">Summary:</span> Review &amp; execute</span>
                ) : activeStep.id === StepId.STANDARDIZE ? (
                  <span>
                    <span className="text-[#fa233b]">Standardize:</span>
                    {' '}
                    {config.standardize.use_filename_fallback ? 'Filename timestamp' : 'Folder timestamp'}
                    {' '}
                    <span className="text-[#8e8e93]">→</span>
                    {' '}
                    {config.timestamp_format.hour_format_12 ? '1993-07-12 4-52-24AM' : '1993-07-12 04-52-24'}
                  </span>
                ) : activeStep.id === StepId.DEDUPLICATE ? (
                  <span><span className="text-[#fa233b]">Deduplicate:</span> abc (1).jpg ➔ abc.jpg</span>
                ) : activeStep.id === StepId.TRANSFER ? (
                  <span className="truncate">
                    <span className="text-[#fa233b]">Transfer:</span>
                    {' '}
                    {config.sourceDir ? config.sourceDir.split('/').pop() : 'Source'}
                    {' '}
                    <span className="text-[#fa233b]">➔</span>
                    {' '}
                    {config.targetDir ? config.targetDir.split('/').pop() : 'Target'}
                  </span>
                ) : activeStep.id === StepId.GROUP ? (
                  <span>
                    <span className="text-[#fa233b]">Group:</span>
                    {' '}
                    {config.group.prioritize_filename ? 'Filename' : 'EXIF/FS'} ➔ 1993/07
                  </span>
                ) : activeStep.id === StepId.FILENAME ? (
                  <span className="truncate">
                    <span className="text-[#fa233b]">Filename:</span>
                    {' '}
                    {(() => {
                      const timelineMode = config.prefix.timeline_mode ?? (config.prefix.add_timestamp ? 'timeline_plus' : 'off');
                      const timestampPreview = config.timestamp_format.hour_format_12 ? '1993-07-12 4-52-24AM' : '1993-07-12 04-52-24';
                      const prefix = timelineMode === 'timeline_plus' || timelineMode === 'timeline_only'
                        ? timestampPreview
                        : '';
                      const baseBody = config.rename.replace_bodyname
                        ? config.rename.replace_bodyname
                        : 'filename';
                      const withFirst = config.rename.append_first_text ? `${baseBody}_${config.rename.append_first_text}` : baseBody;
                      const withSecond = config.rename.append_second_text ? `${withFirst}_${config.rename.append_second_text}` : withFirst;
                      const needsSep = prefix && timelineMode === 'timeline_plus' && withSecond;
                      return (
                        <>
                          <span className="text-[#8e8e93]">{prefix}</span>
                          <span className="text-[#8e8e93]">{needsSep ? '_' : ''}</span>
                          <span className="text-[#8e8e93]">{timelineMode === 'timeline_only' ? '' : withSecond}</span>
                        </>
                      );
                    })()}
                    <span className="text-[#8e8e93]">
                      {(() => {
                        const rawExt = config.extension.uniform_extensions ? '.jpg' : '.JPEG';
                        const cleanedExt = config.extension.clean_extensions ? rawExt.toLowerCase() : rawExt;
                        return config.extension.clean_extensions ? cleanedExt : `${rawExt}${rawExt}`;
                      })()}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 non-draggable">
            {/* Control Group */}
            <div className="flex p-0.5 rounded-xl bg-black/20 border border-white/5 backdrop-blur-md">
              {/* 1. Undo */}
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo Last Operation"
                className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 active:scale-95 ${!canUndo
                  ? 'text-[#444] cursor-not-allowed'
                  : 'text-[#86868b] hover:text-white hover:bg-white/5'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
              </button>



              {/* 3. Settings */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Application Settings"
                className="relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 active:scale-95 text-[#86868b] hover:text-white hover:bg-white/5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </button>

              {/* 4. Simulation */}
              <button
                onClick={() => setConfig({ ...config, isDryRun: !config.isDryRun })}
                title={config.isDryRun ? "Disable Simulation Mode" : "Enable Simulation Mode"}
                className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 active:scale-95 ${config.isDryRun
                  ? 'bg-[#fa233b]/20 text-[#fa233b] shadow-sm'
                  : 'text-[#86868b] hover:text-white hover:bg-white/5'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0 relative">
          {activeStep.id === StepId.SETUP ? (
            <Setup
              config={config}
              setConfig={setConfig}
              presets={availablePresets}
              onApplyPreset={handleApplyPreset}
              activePresetId={activePresetId}
              selectedSetupCardId={selectedSetupCardId}
              onSelectSetupCard={handleSelectSetupCard}
              hasSavedLogic={!!savedLogicPreset}
              onUseSavedLogic={handleUseSavedLogic}
              onSaveCurrentLogic={handleSaveCurrentLogic}
              onContinue={() => setActiveStepId(StepId.SUMMARY)}
            />
          ) : activeStep.id === StepId.PREVIEW ? (
            <Preview config={config} />
          ) : activeStep.id === StepId.SUMMARY ? (
            <PipelineSummary
              steps={steps}
              rules={STEP_RULES}
              onProcessAll={handleProcessAll}
              onAdjustConfiguration={() => {
                // Keep user in Summary and return to "Ready to Process" state.
                setSteps(prev => prev.map(step => {
                  if (step.id === StepId.SETUP || step.id === StepId.PREVIEW || step.id === StepId.SUMMARY) {
                    return step;
                  }
                  return { ...step, status: PipelineStatus.IDLE, results: [] };
                }));
                scanCacheRef.current.clear();
                setScanRefreshKey(prev => prev + 1);
                void forceRefreshPathCounts();
                setActiveStepId(StepId.SUMMARY);
              }}
              hasConfig={!!config.sourceDir}
              presets={availablePresets}
              onApplyPreset={handleApplyPreset}
              config={config}
              setConfig={setConfig}
              activePresetId={activePresetId}
            />
          ) : (
            <ResultsTable
              files={activeStep.enabled ? (activeStep.results || []) : []}
              isDark={true}
              rules={STEP_RULES[activeStep.id]}
              onRun={() => handleRunStep(activeStep.id)}
              isProcessing={activeStep.status === PipelineStatus.RUNNING}
              status={activeStep.status} // Pass status
              hasConfig={!!config.sourceDir}
              isEnabled={activeStep.enabled}
              locked={activePresetId !== 'none'}
              settings={activeStep.id === StepId.STANDARDIZE ? [
                {
                  description: "Standardize",
                  label: "Fallback: Scan Filenames",
                  example: "Folder missing ➔ Use 1993-07-12 4-52-24AM",
                  key: "use_filename_fallback",
                  value: config.standardize.use_filename_fallback
                }
              ] : activeStep.id === StepId.DEDUPLICATE ? [
                {
                  description: "Deduplicate",
                  label: config.deduplicate.mode === 'smart' ? "Smart (Slower)" : "Safe (Fast)",
                  example: "Off = Safe, On = Smart",
                  key: "smart_mode",
                  value: config.deduplicate.mode === 'smart'
                }
              ] : activeStep.id === StepId.FILENAME ? ([
                {
                  description: "Prefix",
                  label: "Timeline Mode",
                  example: "1993-07-12 4-52-24AM_filename.jpg",
                  key: "timeline_mode",
                  value: config.prefix.timeline_mode ?? (config.prefix.add_timestamp ? 'timeline_plus' : 'off'),
                  options: [
                    { value: 'off', label: 'Off' },
                    { value: 'timeline_only', label: 'Time' },
                    { value: 'timeline_plus', label: 'Both' }
                  ]
                },
                {
                  description: "Bodyname",
                  label: "Replace Name",
                  example: "newname",
                  key: "replace_bodyname",
                  value: config.rename.replace_bodyname || ""
                },
                {
                  description: "",
                  label: "Append 1st Text",
                  example: "filename_text.jpg",
                  key: "append_first_text",
                  value: config.rename.append_first_text || ""
                },
                {
                  description: "",
                  label: "Append 2nd Text",
                  example: "filename_text_text.jpg",
                  key: "append_second_text",
                  value: config.rename.append_second_text || ""
                },
                {
                  description: "Extension",
                  label: "Clean Extensions",
                  example: (
                    <span>
                      filename.jpg
                      <span className="line-through">.jpg</span>
                    </span>
                  ),
                  key: "clean_extensions",
                  value: config.extension.clean_extensions
                },
                {
                  description: "",
                  label: "Uniform Extensions",
                  example: ".png, .heic ➔ .jpg",
                  key: "uniform_extensions",
                  value: config.extension.uniform_extensions
                }
              ]) : activeStep.id === StepId.GROUP ? [
                {
                  description: "Year/Month",
                  label: "Filename First",
                  example: "1993-07-12_filename.jpg ➔ 1993/07",
                  key: "prioritize_filename",
                  value: config.group.prioritize_filename
                }
              ] : activeStep.id === StepId.TRANSFER ? [
                {
                  description: "Transfer",
                  label: "Overwrite Existing Files",
                  example: "Keep both (rename new as '_1')",
                  key: "overwrite",
                  value: config.transfer.overwrite
                }
              ] : undefined}
              onSettingToggle={(key) => {
                if (activeStep.id === StepId.STANDARDIZE) {
                  setConfig(prev => ({
                    ...prev,
                    standardize: {
                      ...prev.standardize,
                      [key]: !prev.standardize[key as keyof typeof prev.standardize]
                    }
                  }));
                } else if (activeStep.id === StepId.FILENAME) {
                  if (key === 'clean_extensions' || key === 'uniform_extensions') {
                    setConfig(prev => ({
                      ...prev,
                      extension: {
                        ...prev.extension,
                        [key]: !prev.extension[key as keyof typeof prev.extension]
                      }
                    }));
                  }
                } else if (activeStep.id === StepId.DEDUPLICATE) {
                  if (key === 'smart_mode') {
                    setConfig(prev => ({
                      ...prev,
                      deduplicate: {
                        ...prev.deduplicate,
                        mode: prev.deduplicate.mode === 'smart' ? 'safe' : 'smart'
                      }
                    }));
                  }
                } else if (activeStep.id === StepId.GROUP) {
                  setConfig(prev => ({
                    ...prev,
                    group: {
                      ...prev.group,
                      [key]: !prev.group[key as keyof typeof prev.group]
                    }
                  }));
                } else if (activeStep.id === StepId.TRANSFER) {
                  setConfig(prev => ({
                    ...prev,
                    transfer: {
                      ...prev.transfer,
                      [key]: !prev.transfer[key as keyof typeof prev.transfer]
                    }
                  }));
                }
              }}
              onSettingChange={(key, value) => {
                if (activeStep.id === StepId.FILENAME) {
                  if (key === 'timeline_mode') {
                    setConfig(prev => ({
                      ...prev,
                      prefix: {
                        ...prev.prefix,
                        timeline_mode: value as 'off' | 'timeline_only' | 'timeline_plus',
                        add_timestamp: value !== 'off'
                      }
                    }));
                  } else if (key === 'replace_bodyname' || key === 'append_first_text' || key === 'append_second_text') {
                    setConfig(prev => ({
                      ...prev,
                      rename: {
                        ...prev.rename,
                        [key]: value
                      }
                    }));
                  }
                }
              }}
              onReset={() => {
                // Clear results for current step so user can see settings again
                updateStepStatus(activeStep.id, PipelineStatus.IDLE, []);
              }}
            />
          )}
        </div>

        {steps.some(s => s.status === PipelineStatus.RUNNING) && (
          <div className="absolute bottom-10 right-10 z-30 flex items-center space-x-4 pl-3 pr-8 py-3 rounded-2xl shadow-2xl border border-white/10 vibrancy animate-in slide-in-from-bottom-10 duration-500">
            <div className="w-10 h-10 rounded-xl bg-[#fa233b] flex items-center justify-center shadow-lg shadow-[#fa233b]/30">
              <svg className="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </div>
            <div className="text-[13px] font-bold">
              <p className="opacity-40 uppercase tracking-[0.1em] text-[9px] mb-0.5">Active Operation</p>
              <p className="leading-tight text-white">Processing Library...</p>
            </div>
          </div>
        )}
      </main>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        setConfig={setConfig}
        presets={availablePresets}
        onApplyPreset={handleApplyPreset}
        activePresetId={activePresetId}
        showCounts={showCounts}
        setShowCounts={setShowCounts}
      />
    </div>
  );
};

export default App;

