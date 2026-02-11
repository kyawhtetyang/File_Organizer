import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SettingsModal } from '../components/SettingsModal';
import { PipelineConfig } from '../types';

const baseConfig: PipelineConfig = {
  sourceDir: '/tmp/#Input',
  targetDir: '/tmp/#Output',
  isDryRun: true,
  fileCategory: 'all',
  timestamp_format: { preset: 'pcloud', hour_format_12: true },
  standardize: { use_filename_fallback: false },
  metadata: { start_datetime: '1993-07-12 04-52-24 AM', add_timestamp: true, keep_original_name: false },
  deduplicate: { faster_process: true },
  prefix: { add_timestamp: true, timeline_mode: 'timeline_plus' },
  extension: { clean_extensions: true, uniform_extensions: true },
  rename: { replace_bodyname: '', append_first_text: '', append_second_text: '' },
  group: { prioritize_filename: true },
  transfer: { overwrite: false },
  processing_file_limit: 500,
  max_preview_files: 100
};

describe('SettingsModal', () => {
  it('renders settings modal (snapshot)', () => {
    const { container } = render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        config={baseConfig}
        setConfig={vi.fn()}
        presets={[]}
        onApplyPreset={vi.fn()}
        activePresetId="none"
        showCounts={true}
        setShowCounts={vi.fn()}
      />
    );
    expect(container).toMatchSnapshot();
  });
});

