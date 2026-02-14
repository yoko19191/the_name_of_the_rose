'use client';

import { useEffect, useState } from 'react';

const LOCAL_STORAGE_QUOTA_BYTES = 5 * 1024 * 1024; // 常见浏览器 localStorage 配额约 5MB
const WARNING_THRESHOLD = 0.9;

function getLocalStorageUsageBytes() {
  if (typeof window === 'undefined') return 0;

  let total = 0;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    const value = window.localStorage.getItem(key) || '';
    // localStorage 按 UTF-16 字符存储，粗略按 2 bytes/char 估算
    total += (key.length + value.length) * 2;
  }
  return total;
}

function formatMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

export function StorageUsageBar() {
  const [usedBytes, setUsedBytes] = useState(0);

  useEffect(() => {
    const updateUsage = () => {
      setUsedBytes(getLocalStorageUsageBytes());
    };

    updateUsage();
    const timer = window.setInterval(updateUsage, 1200);
    window.addEventListener('storage', updateUsage);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', updateUsage);
    };
  }, []);

  const ratio = Math.min(1, usedBytes / LOCAL_STORAGE_QUOTA_BYTES);
  const isNearLimit = ratio >= WARNING_THRESHOLD;
  const fillClass = isNearLimit ? 'bg-rose-500' : 'bg-[var(--accent)]';

  return (
    <>
      <div
        className="
          fixed bottom-0 left-0 right-0 z-20 h-[2px]
          bg-[var(--muted)]/80 backdrop-blur-[1px]
          pointer-events-none
        "
        aria-hidden="true"
      >
        <div
          className={`h-full transition-all duration-300 ${fillClass}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      {isNearLimit && (
        <div
          className="
            fixed bottom-3 right-3 z-50 max-w-[22rem]
            rounded-lg border border-rose-300/70
            bg-[var(--node-bg)]/95 px-3 py-2 shadow-lg backdrop-blur-sm
            text-[11px] leading-relaxed text-[var(--primary)] font-serif
          "
          role="status"
          aria-live="polite"
        >
          <div className="text-rose-700">本地存储即将满了（{(ratio * 100).toFixed(0)}%）</div>
          <div>建议：</div>
          <div>1. 在左侧删除不再需要的旧网络。</div>
          <div>2. 清理浏览器该站点的 Local Storage / Site Data。</div>
          <div className="text-[10px] text-[var(--primary-light)]">
            当前约 {formatMB(usedBytes)}MB / {formatMB(LOCAL_STORAGE_QUOTA_BYTES)}MB
          </div>
        </div>
      )}
    </>
  );
}
