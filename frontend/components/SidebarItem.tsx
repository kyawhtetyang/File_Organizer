
import React from 'react';
import { PipelineStep, PipelineStatus, StepId } from '../types';

interface SidebarItemProps {
  step?: PipelineStep;
  isActive?: boolean;
  onSelect?: (id: StepId) => void;
  onToggle?: (id: StepId) => void;
  count?: number;
  label?: string;            // Allow overriding name directly
  onClick?: () => void;      // Allow custom click handler
  rightContent?: React.ReactNode; // Allow custom right-side content (for Start/Dest badges)
  disabled?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  step,
  isActive = false,
  onSelect,
  onToggle,
  count,
  label,
  onClick,
  rightContent,
  disabled = false,
}) => {
  // If "step" is provided, derive state from it. Otherwise use defaults.
  const name = label || step?.name || '';
  const isRunning = step?.status === PipelineStatus.RUNNING;
  const isSummary = step?.id === StepId.SUMMARY || step?.id === StepId.SETUP;
  const isEnabled = step?.enabled;

  const handleClick = (e: React.MouseEvent) => {
    // Navigation should always be allowed (to view settings), even if toggle is locked
    if (onClick) {
      onClick();
    } else if (onSelect && step) {
      onSelect(step.id);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return; // Toggle is strictly locked
    if (onToggle && step) {
      onToggle(step.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-center px-3 h-9 w-full rounded-lg transition-all duration-200 cursor-pointer active:scale-[0.98] ${isActive
        ? 'bg-[#1c1c1e] text-white shadow-lg border border-white/10'
        : 'text-[#8e8e93] hover:bg-white/5 hover:text-white border border-transparent'
        } ${isSummary ? 'mb-8' : ''}`}
    >
      {/* Step Name (No Icon) */}
      <div className="flex items-center flex-1 overflow-hidden">
        <span className={`text-sm font-semibold tracking-tight truncate flex-1 ${disabled ? 'opacity-100' : ''}`}>
          {name}
        </span>
      </div>

      <div className="flex items-center space-x-3">
        {/* Custom Right Content (e.g. Set/Empty Badges) */}
        {rightContent && (
          <div className="pl-2">{rightContent}</div>
        )}

        {/* Count/Status Display (Only if not using custom content) */}
        {!rightContent && isRunning ? (
          <div className="flex space-x-1 mr-2">
            <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${isActive || isSummary ? 'bg-white' : 'bg-[#fa233b]'}`} />
            <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${isActive || isSummary ? 'bg-white' : 'bg-[#fa233b]'}`} />
            <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isActive || isSummary ? 'bg-white' : 'bg-[#fa233b]'}`} />
          </div>
        ) : !rightContent && step?.status === PipelineStatus.ERROR ? (
          <div className="mr-2 px-2 py-0.5 bg-red-500/20 text-red-500 text-[10px] font-bold rounded uppercase tracking-wider">
            ERR
          </div>
        ) : !rightContent && count !== undefined ? (
          <span className={`text-[12px] font-mono font-bold px-2 py-0.5 rounded-lg ${isActive || isSummary
            ? 'bg-white/20 text-white'
            : 'bg-[#34C759]/10 text-[#34C759]'}`}>
            {count >= 5000 ? '5000+' : count}
          </span>
        ) : null}

        {/* Custom iOS Toggle Switch (Only for non-summary steps & when no custom content & handler exists) */}
        {!isSummary && !rightContent && step && onToggle && (
          <div
            className={`flex items-center justify-center pl-2 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
            onClick={handleToggle}
          >
            <div className={`
              w-9 h-5 rounded-full transition-colors duration-300 ease-out relative cursor-pointer
              ${isEnabled ? 'bg-[#fa233b]' : 'bg-[#3a3a3c] group-hover:bg-[#48484a]'}
            `}>
              <div className={`
                absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 cubic-bezier(0.175, 0.885, 0.32, 1.275)
                ${isEnabled ? 'translate-x-4' : 'translate-x-0'}
              `} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


















