'use client';

import { useState, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

interface InputPopoverProps {
  position: { x: number; y: number };
  onSubmit: (word: string) => void;
  onClose: () => void;
}

export function InputPopover({ position, onSubmit, onClose }: InputPopoverProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { flowToScreenPosition } = useReactFlow();

  // 将 flow 坐标转换为屏幕坐标
  const screenPosition = flowToScreenPosition(position);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="
          fixed z-50 animate-fade-in
          bg-[var(--node-bg)] border-2 border-[var(--node-border)]
          rounded-lg shadow-xl p-4
        "
        style={{
          left: screenPosition.x,
          top: screenPosition.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-[var(--primary)] mb-2 font-serif">
            输入一个词语或概念
          </label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如：玫瑰、真理、符号..."
            className="
              w-64 px-3 py-2 rounded-md
              bg-[var(--background)] border border-[var(--border)]
              text-[var(--foreground)] placeholder:text-[var(--primary-light)]
              focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
              font-serif
            "
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="
                px-3 py-1.5 rounded-md text-sm
                text-[var(--primary)] hover:bg-[var(--muted)]
                transition-colors
              "
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="
                px-3 py-1.5 rounded-md text-sm
                bg-[var(--primary)] text-[var(--background)]
                hover:bg-[var(--accent)]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              添加
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
