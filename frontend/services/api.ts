
import { RunStepRequest, RunAllRequest, StepResponse, UndoHistoryEntry } from '../types';

const API_BASE_URL =
  (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Note: In a real environment, you'd handle fetch errors and status codes.
 * This mock implementation mimics the backend response for UI development.
 */
export const pipelineApi = {
  async health(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) throw new Error(`Backend failed (${response.status})`);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  async runStep(request: RunStepRequest): Promise<StepResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/run-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e) {
      console.error("API Error:", e);
      return {
        step_id: request.step_id,
        success: false,
        processed_files: [],
        error: String(e) || "Failed to connect to backend"
      };
    }
  },

  async runAll(request: RunAllRequest): Promise<StepResponse[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/run-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e) {
      console.error("API Error:", e);
      return [];
    }
  },

  async getDefaults(): Promise<{ home: string; desktop: string; downloads: string } | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/defaults`);
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e) {
      console.error("API Error:", e);
      return null;
    }
  },

  async listFiles(
    path: string,
    category: string = 'all'
  ): Promise<{ success: boolean; files: Array<{ name: string; size: number }>; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/list-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, category }),
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e: any) {
      return { success: false, files: [], error: String(e) };
    }
  },

  async scanPath(
    path: string,
    category: string = 'all',
    limit?: number,
    signal?: AbortSignal
  ): Promise<{ count: number; exists: boolean; truncated?: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/scan-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, category, limit }),
        signal
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        throw e;
      }
      return { count: 0, exists: false, error: String(e) };
    }
  },

  async createPath(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/create-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async undo(): Promise<{ success: boolean; message: string; undone_count: number; errors?: string[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e) {
      console.error("Undo API Error:", e);
      return { success: false, message: String(e), undone_count: 0 };
    }
  },

  async getUndoHistory(): Promise<UndoHistoryEntry[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/undo/history`);
      if (!response.ok) throw new Error('Backend failed');
      const data = await response.json();
      return data.history || [];
    } catch (e) {
      console.error("Undo History API Error:", e);
      return [];
    }
  },

  async undoOperation(operationId: string): Promise<{ success: boolean; message: string; undone_count: number; errors?: string[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/undo/${operationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e) {
      console.error("Undo Operation API Error:", e);
      return { success: false, message: String(e), undone_count: 0 };
    }
  },

  async clearUndoHistory(): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/undo/clear`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e) {
      console.error("Clear Undo API Error:", e);
      return { success: false };
    }
  },

  async getPresetOverrides(): Promise<Record<string, { source: string; target: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/preset-overrides`);
      if (!response.ok) throw new Error('Backend failed');
      const data = await response.json();
      return data.overrides || {};
    } catch (e) {
      console.error("Preset Overrides API Error:", e);
      return {};
    }
  },

  async setPresetOverride(preset_key: string, source: string, target: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/preset-overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_key, source, target }),
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e) {
      console.error("Set Preset Override API Error:", e);
      return { success: false };
    }
  },

  async getCustomPresets(): Promise<Array<{ id: number; name: string; source: string; target: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/custom-presets`);
      if (!response.ok) throw new Error('Backend failed');
      const data = await response.json();
      return data.presets || [];
    } catch (e) {
      console.error("Custom Presets API Error:", e);
      return [];
    }
  },

  async createCustomPreset(name: string, source: string, target: string): Promise<{ success: boolean; preset?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/custom-presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, source, target }),
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e) {
      console.error("Create Preset API Error:", e);
      return { success: false };
    }
  },

  async deleteCustomPreset(presetId: number): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/custom-presets/${presetId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e) {
      console.error("Delete Preset API Error:", e);
      return { success: false };
    }
  },

  async logClientError(payload: {
    message: string;
    stack?: string;
    source?: string;
    url?: string;
    user_agent?: string;
    timestamp?: string;
  }): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/log-client-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e) {
      console.error("Client Error Log API Error:", e);
      return { success: false };
    }
  }
};




