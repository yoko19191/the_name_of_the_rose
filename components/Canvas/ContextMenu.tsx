'use client';

import { useState, useRef, useEffect } from 'react';

interface ContextMenuProps {
  position: { x: number; y: number };
  anchor?: 'point' | 'center';
  type: 'node' | 'pane';
  nodeWord?: string;
  nodeExplanation?: string;
  isExpanded?: boolean;
  onClose: () => void;
  onExpandWithDirection?: (direction: string) => void;
  onOrganizeNetwork?: () => void;
}

export function ContextMenu({
  position,
  anchor = 'point',
  type,
  nodeWord,
  nodeExplanation,
  isExpanded = false,
  onClose,
  onExpandWithDirection,
  onOrganizeNetwork,
}: ContextMenuProps) {
  const [direction, setDirection] = useState('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [onClose]);

  const handleExpand = () => {
    if (onExpandWithDirection) {
      onExpandWithDirection(direction);
    }
    onClose();
  };

  const handleOrganize = () => {
    if (onOrganizeNetwork) {
      onOrganizeNetwork();
    }
    onClose();
  };

  const canExpand = type === 'node' && !isExpanded;

  if (type === 'pane') {
    return (
      <div
        ref={menuRef}
        className="
          fixed z-50 animate-fade-in
          bg-[var(--node-bg)] border border-[var(--node-border)]
          rounded-lg shadow-xl py-1 min-w-[160px]
        "
        style={{ left: position.x, top: position.y }}
      >
        <button
          onClick={handleOrganize}
          className="
            w-full px-4 py-2 text-left text-sm font-serif
            text-[var(--foreground)] hover:bg-[var(--muted)]
            flex items-center gap-2 transition-colors
          "
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          整理网络
        </button>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="
        fixed z-50 animate-fade-in
        bg-[var(--node-bg)] border border-[var(--node-border)]
        rounded-lg shadow-xl p-4 min-w-[280px]
      "
      style={{
        left: position.x,
        top: position.y,
        transform: anchor === 'center' ? 'translate(-50%, -50%)' : undefined,
      }}
    >
      <div className="mb-3">
        <span className="text-sm text-[var(--primary)] font-serif">展开</span>
        <span className="text-lg font-serif text-[var(--foreground)] ml-2">「{nodeWord}」</span>
      </div>

      {nodeExplanation && (
        <div
          className="
            mb-3 rounded-md border border-[var(--border)]
            bg-[var(--background)] px-3 py-2
            text-sm leading-relaxed font-serif text-[var(--foreground)]
            max-h-[220px] overflow-y-auto
          "
        >
          {nodeExplanation}
        </div>
      )}

      {!showInput ? (
        <div className="space-y-2">
          {canExpand && (
            <>
              <button
                onClick={() => {
                  if (onExpandWithDirection) {
                    onExpandWithDirection('');
                  }
                  onClose();
                }}
                className="
                  w-full px-3 py-2 text-left text-sm font-serif rounded-md
                  text-[var(--foreground)] hover:bg-[var(--muted)]
                  flex items-center gap-2 transition-colors
                "
              >
                <svg className="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                自动生成相关概念
              </button>
              <button
                onClick={() => setShowInput(true)}
                className="
                  w-full px-3 py-2 text-left text-sm font-serif rounded-md
                  text-[var(--foreground)] hover:bg-[var(--muted)]
                  flex items-center gap-2 transition-colors
                "
              >
                <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                指定生成方向...
              </button>
            </>
          )}
          {!canExpand && (
            <div className="px-1 text-xs font-serif text-[var(--primary)]">
              该节点已展开，可继续查看上方概念说明。
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            ref={inputRef}
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            placeholder="输入你想探索的方向，例如：从哲学角度、与艺术的关系、历史演变..."
            rows={3}
            className="
              w-full px-3 py-2 rounded-md text-sm
              bg-[var(--background)] border border-[var(--border)]
              text-[var(--foreground)] placeholder:text-[var(--primary-light)]
              focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
              font-serif resize-none
            "
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowInput(false)}
              className="
                px-3 py-1.5 rounded-md text-sm font-serif
                text-[var(--primary)] hover:bg-[var(--muted)]
                transition-colors
              "
            >
              返回
            </button>
            <button
              onClick={handleExpand}
              className="
                px-3 py-1.5 rounded-md text-sm font-serif
                bg-[var(--primary)] text-[var(--background)]
                hover:bg-[var(--accent)]
                transition-colors
              "
            >
              生成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
