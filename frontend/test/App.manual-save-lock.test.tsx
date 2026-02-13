import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

const apiMocks = vi.hoisted(() => ({
  health: vi.fn(async () => ({ ok: true })),
  runStep: vi.fn(),
  runAll: vi.fn(),
  getDefaults: vi.fn(),
  listFiles: vi.fn(),
  scanPath: vi.fn(async () => ({ count: 0, exists: true, truncated: false })),
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
  Setup: ({ onSaveCurrentLogic }: any) => (
    <button onClick={() => onSaveCurrentLogic?.()}>Manual Preset Save</button>
  ),
}));

vi.mock('../components/Preview', () => ({
  Preview: () => <div />,
}));

vi.mock('../components/PipelineSummary', () => ({
  PipelineSummary: () => <div />,
}));

vi.mock('../components/SettingsModal', () => ({
  SettingsModal: () => null,
}));

vi.mock('../components/ResultsTable', () => ({
  ResultsTable: ({ locked }: any) => <div>Results Locked: {String(locked)}</div>,
}));

vi.mock('../components/SidebarItem', () => ({
  SidebarItem: ({ step, onSelect }: any) => (
    <button onClick={() => onSelect?.(step.id)}>{step.id}</button>
  ),
}));

describe('Manual preset save lock behavior', () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((mockFn: any) => {
      if (typeof mockFn?.mockClear === 'function') mockFn.mockClear();
    });
    apiMocks.health.mockResolvedValue({ ok: true });
    apiMocks.getUndoHistory.mockResolvedValue([]);
  });

  it('locks step toggles after manual preset save', async () => {
    render(<App />);

    fireEvent.click(screen.getByText('Manual Preset Save'));

    fireEvent.click(screen.getByText('filename'));

    await waitFor(() => {
      expect(Boolean(screen.getByText('Results Locked: true'))).toBe(true);
    });
  });
});

