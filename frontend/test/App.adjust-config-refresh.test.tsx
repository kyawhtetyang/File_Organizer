import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

const apiMocks = vi.hoisted(() => ({
  health: vi.fn(async () => ({ ok: true })),
  runStep: vi.fn(),
  runAll: vi.fn(async () => ([
    { step_id: 'standardize', success: true, processed_files: [] },
    { step_id: 'deduplicate', success: true, processed_files: [] },
    { step_id: 'filename', success: true, processed_files: [] },
    { step_id: 'group', success: true, processed_files: [] },
    { step_id: 'transfer', success: true, processed_files: [] },
  ])),
  getDefaults: vi.fn(async () => ({ home: '/tmp', desktop: '/tmp/Desktop', downloads: '/tmp/Downloads' })),
  listFiles: vi.fn(),
  scanPath: vi.fn(async () => ({ count: 5, exists: true, truncated: false })),
  createPath: vi.fn(),
  undo: vi.fn(),
  getUndoHistory: vi.fn(async () => []),
  undoOperation: vi.fn(),
  clearUndoHistory: vi.fn(),
  getPresetOverrides: vi.fn(async () => ({})),
  setPresetOverride: vi.fn(),
  getCustomPresets: vi.fn(),
  createCustomPreset: vi.fn(),
  deleteCustomPreset: vi.fn(),
  logClientError: vi.fn(),
}));

vi.mock('../services/api', () => ({
  pipelineApi: apiMocks,
}));

vi.mock('../components/Setup', () => ({
  Setup: ({ setConfig, onContinue }: any) => (
    <div>
      <button
        onClick={() =>
          setConfig((prev: any) => ({
            ...prev,
            sourceDir: '/tmp/source',
            targetDir: '/tmp/target',
            isDryRun: false,
          }))
        }
      >
        Set Paths Non Simulation
      </button>
      <button onClick={onContinue}>Continue To Summary</button>
    </div>
  ),
}));

vi.mock('../components/PipelineSummary', () => ({
  PipelineSummary: ({ onProcessAll, onAdjustConfiguration }: any) => (
    <div>
      <button onClick={onProcessAll}>Execute Operation</button>
      <button onClick={onAdjustConfiguration}>Adjust Configuration</button>
    </div>
  ),
}));

vi.mock('../components/SidebarItem', () => ({
  SidebarItem: () => <div />,
}));

vi.mock('../components/ResultsTable', () => ({
  ResultsTable: () => <div />,
}));

vi.mock('../components/Preview', () => ({
  Preview: () => <div />,
}));

vi.mock('../components/SettingsModal', () => ({
  SettingsModal: () => null,
}));

describe('App summary adjust refresh', () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((mockFn: any) => {
      if (typeof mockFn?.mockClear === 'function') mockFn.mockClear();
    });
    apiMocks.health.mockResolvedValue({ ok: true });
    apiMocks.getUndoHistory.mockResolvedValue([]);
    apiMocks.scanPath.mockResolvedValue({ count: 5, exists: true, truncated: false });
    apiMocks.runAll.mockResolvedValue([
      { step_id: 'standardize', success: true, processed_files: [] },
      { step_id: 'deduplicate', success: true, processed_files: [] },
      { step_id: 'filename', success: true, processed_files: [] },
      { step_id: 'group', success: true, processed_files: [] },
      { step_id: 'transfer', success: true, processed_files: [] },
    ]);
  });

  it('refreshes path scan after adjust configuration post execute', async () => {
    render(<App />);

    fireEvent.click(screen.getByText('Set Paths Non Simulation'));
    await waitFor(() => {
      expect(apiMocks.scanPath).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Continue To Summary'));
    fireEvent.click(screen.getByText('Execute Operation'));

    await waitFor(() => {
      expect(apiMocks.runAll).toHaveBeenCalledTimes(1);
    });

    const runAllArg = apiMocks.runAll.mock.calls[0][0];
    expect(runAllArg.config.isDryRun).toBe(false);

    const scanCallsBeforeAdjust = apiMocks.scanPath.mock.calls.length;
    fireEvent.click(screen.getByText('Adjust Configuration'));

    await waitFor(() => {
      expect(apiMocks.scanPath.mock.calls.length).toBeGreaterThan(scanCallsBeforeAdjust);
    });
  });
});

