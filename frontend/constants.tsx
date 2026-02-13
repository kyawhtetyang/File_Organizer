
import React from 'react';
import { StepId, PipelineStep, PipelineStatus } from './types';

export const INITIAL_STEPS: PipelineStep[] = [
  {
    id: StepId.STANDARDIZE,
    name: 'Standardize',
    description: 'Folder timestamp to file metadata & rename',
    enabled: true,
    status: PipelineStatus.IDLE,
  },
  {
    id: StepId.DEDUPLICATE,
    name: 'Deduplicate',
    description: 'Removes duplicate files like "photo (1).jpg"',
    enabled: true,
    status: PipelineStatus.IDLE,
  },
  {
    id: StepId.FILENAME,
    name: 'Filename',
    description: 'Configure prefix, body, and extension',
    enabled: true,
    status: PipelineStatus.IDLE,
  },
  {
    id: StepId.GROUP,
    name: 'Group',
    description: 'Organizes files into Year/Month folder structures',
    enabled: true,
    status: PipelineStatus.IDLE,
  },
  {
    id: StepId.TRANSFER,
    name: 'Transfer',
    description: 'Moves processed files to the target directory',
    enabled: true,
    status: PipelineStatus.IDLE,
  },
];



















