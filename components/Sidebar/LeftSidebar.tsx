'use client';

import type { WordNetwork } from '@/types';

interface LeftSidebarProps {
  isOpen: boolean;
  networks: WordNetwork[];
  activeNetworkId: string | null;
  onToggle: () => void;
  onCreateNetwork: (name: string) => void;
  onSwitchNetwork: (id: string) => void;
  onDeleteNetwork: (id: string) => void;
  onRenameNetwork: (id: string, name: string) => void;
}

export function LeftSidebar({
  isOpen,
  networks,
  activeNetworkId,
  onToggle,
  onCreateNetwork,
  onSwitchNetwork,
  onDeleteNetwork,
  onRenameNetwork,
}: LeftSidebarProps) {
  const handleCreate = () => {
    const name = `网络 ${networks.length + 1}`;
    onCreateNetwork(name);
  };

  return (
    <>
      {/* 切换按钮 */}
      <button
        onClick={onToggle}
        className="
          fixed left-4 top-4 z-50
          w-10 h-10 rounded-lg
          bg-[var(--node-bg)] border border-[var(--node-border)]
          shadow-md hover:shadow-lg
          flex items-center justify-center
          transition-all duration-200
          hover:bg-[var(--node-hover)]
        "
        title="网络管理"
      >
        <svg
          className="w-5 h-5 text-[var(--primary)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* 侧边栏 */}
      <div
        className={`
          fixed left-0 top-0 h-full w-72 z-40
          bg-[var(--background)] border-r border-[var(--border)]
          shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-serif text-[var(--foreground)]">能指网络</h2>
            <button
              onClick={onToggle}
              className="
                w-8 h-8 rounded-md
                hover:bg-[var(--muted)]
                flex items-center justify-center
                transition-colors
              "
            >
              <svg
                className="w-5 h-5 text-[var(--primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 创建按钮 */}
          <button
            onClick={handleCreate}
            className="
              w-full py-2.5 px-4 mb-4 rounded-lg
              border border-dashed border-[var(--border)]
              text-[var(--primary)] hover:bg-[var(--muted)]
              transition-colors font-serif text-sm
              flex items-center justify-center gap-2
            "
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            创建新网络
          </button>

          {/* 网络列表 */}
          <div className="space-y-2">
            {networks.map((network) => (
              <div
                key={network.id}
                className={`
                  group p-3 rounded-lg cursor-pointer
                  transition-colors
                  ${
                    network.id === activeNetworkId
                      ? 'bg-[var(--muted)] border border-[var(--border)]'
                      : 'hover:bg-[var(--node-hover)]'
                  }
                `}
                onClick={() => onSwitchNetwork(network.id)}
              >
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={network.name}
                    onChange={(e) => {
                      e.stopPropagation();
                      onRenameNetwork(network.id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="
                      bg-transparent border-none outline-none
                      font-serif text-[var(--foreground)]
                      w-full
                    "
                  />
                  {networks.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNetwork(network.id);
                      }}
                      className="
                        opacity-0 group-hover:opacity-100
                        w-6 h-6 rounded
                        hover:bg-[var(--border)]
                        flex items-center justify-center
                        transition-all
                      "
                    >
                      <svg
                        className="w-4 h-4 text-[var(--primary)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="text-xs text-[var(--primary-light)] mt-1 font-serif">
                  {network.nodes.length} 个词语
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
}
