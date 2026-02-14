'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { WordNodeData } from '@/types';

interface WordNodeProps {
  data: WordNodeData;
  selected?: boolean;
}

function WordNodeComponent({ data, selected }: WordNodeProps) {
  const isExpanded = data.isExpanded && !data.isLoading;
  const isRoot = data.isRoot === true;
  const centerHandleClassName = `
    !absolute !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2
    !w-2 !h-2 !min-w-0 !min-h-0
    !border-0 !bg-transparent !opacity-0 !pointer-events-none
  `;

  return (
    <div
      className={`
        group relative px-5 py-3 rounded-lg border-2
        shadow-md transition-all duration-300
        min-w-[80px] max-w-[160px] text-center
        ${isExpanded
          ? 'bg-[var(--muted)] border-[var(--border)] cursor-default'
          : 'bg-[var(--node-bg)] border-[var(--node-border)] hover:shadow-lg cursor-pointer'
        }
        ${selected && !isExpanded ? 'ring-2 ring-[var(--accent)] border-[var(--accent)]' : ''}
        ${data.isNew ? 'border-orange-400 ring-2 ring-orange-400/50 shadow-orange-200/50 shadow-lg animate-highlight-pulse' : ''}
        ${isRoot ? 'border-rose-300 shadow-[0_0_0_1px_rgba(190,24,93,0.20)]' : ''}
        ${data.isLoading ? 'animate-pulse-soft' : ''}
      `}
    >
      {/* 隐藏的连接点 - 用于边的连接 */}
      <Handle
        type="target"
        position={Position.Top}
        className={centerHandleClassName}
      />
      <Handle
        type="source"
        position={Position.Top}
        className={centerHandleClassName}
      />

      {/* 加载指示器 */}
      {data.isLoading && (
        <div className="absolute -top-1 -right-1 w-4 h-4">
          <div className="w-full h-full border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <span className={`text-lg font-serif ${isExpanded ? 'text-[var(--primary-light)]' : 'text-[var(--foreground)]'}`}>
        {data.word}
      </span>

      {data.explanation && (
        <div
          className="
            absolute left-1/2 -translate-x-1/2 bottom-full mb-2
            px-4 py-3 rounded-lg
            bg-[var(--foreground)] text-[var(--background)]
            text-sm leading-relaxed
            min-w-[200px] max-w-[300px]
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            pointer-events-none z-50
            shadow-xl
          "
        >
          <div className="font-serif">{data.explanation}</div>
          <div
            className="
              absolute left-1/2 -translate-x-1/2 top-full
              border-8 border-transparent border-t-[var(--foreground)]
            "
          />
        </div>
      )}
    </div>
  );
}

export const WordNode = memo(WordNodeComponent);
