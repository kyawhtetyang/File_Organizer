
import React from 'react';

export enum StepId {
  SETUP = 'setup',
  PREVIEW = 'preview',
  SUMMARY = 'summary',
  STANDARDIZE = 'standardize',
  DEDUPLICATE = 'deduplicate',
  FILENAME = 'filename',
  GROUP = 'group',
  TRANSFER = 'transfer'
}

export enum PipelineStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error'
}

export type FileCategory = 'all' | 'docs' | 'photos' | 'audio' | 'video' | 'code' | 'others';

export interface FileChange {
  original: string;
  new: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export interface PipelineStep {
  id: StepId;
  name: string;
  description: string;
  enabled: boolean;
  status: PipelineStatus;
  results?: FileChange[];
  error?: string;
}

export interface PrefixConfig {
  add_timestamp: boolean;
  // hour_format_12 moved to timestamp_format
  timeline_mode?: 'off' | 'timeline_only' | 'timeline_plus';
}

export interface RenameConfig {
  replace_bodyname?: string;
  append_first_text?: string;
  append_second_text?: string;
}

export interface ExtensionConfig {
  clean_extensions: boolean;
  uniform_extensions: boolean;
}

export interface MetadataConfig {
  start_datetime: string;
  add_timestamp?: boolean;
  keep_original_name?: boolean;
}

export interface DeduplicateConfig {
  faster_process: boolean;
}

export interface TimestampFormatConfig {
  preset: string;  // 'pcloud', 'google_photos', 'default'
  hour_format_12: boolean;
}

export interface StandardizeConfig {
  use_filename_fallback: boolean;
}

export interface GroupConfig {
  prioritize_filename: boolean;
}

export interface TransferConfig {
  overwrite: boolean;
}

export interface PipelineConfig {
  sourceDir: string;
  targetDir: string;
  isDryRun: boolean;
  fileCategory: FileCategory;
  timestamp_format: TimestampFormatConfig;
  standardize: StandardizeConfig;
  metadata: MetadataConfig;
  deduplicate: DeduplicateConfig;
  prefix: PrefixConfig;
  extension: ExtensionConfig;
  rename: RenameConfig;
  group: GroupConfig;
  transfer: TransferConfig;
  processing_file_limit: number;
  max_preview_files: number;
}

export interface RunStepRequest {
  step_id: StepId;
  config: PipelineConfig;
}

export interface RunAllRequest {
  steps: StepId[];
  config: PipelineConfig;
}

export interface StepResponse {
  step_id: StepId;
  success: boolean;
  processed_files: FileChange[];
  error?: string;
}

export interface UndoHistoryEntry {
  id: string;
  timestamp: string;
  changes: { original: string; new: string; action: string }[];
}



export interface PipelinePreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color?: string;
  configUpdates: Partial<PipelineConfig>;
  stepUpdates: Partial<Record<StepId, boolean>>;
}




