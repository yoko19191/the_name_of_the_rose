'use client';

import { useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from '@/components/Canvas/Canvas';
import { Header } from '@/components/Header';
import { StorageUsageBar } from '@/components/StorageUsageBar';
import { LeftSidebar } from '@/components/Sidebar/LeftSidebar';
import { RightSidebar } from '@/components/Sidebar/RightSidebar';
import { useWordNetwork } from '@/hooks/useWordNetwork';

export default function Home() {
  const {
    state,
    isLoaded,
    activeNetwork,
    settings,
    addWord,
    expandWord,
    organizeNetwork,
    setBackground,
    updateSettings,
    createNetwork,
    switchNetwork,
    deleteNetwork,
    renameNetwork,
    toggleLeftSidebar,
    toggleRightSidebar,
  } = useWordNetwork();

  const handleNodesChange = useCallback(() => {
    // 节点变化由 useWordNetwork 内部处理
  }, []);

  const handleEdgesChange = useCallback(() => {
    // 边变化由 useWordNetwork 内部处理
  }, []);

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--primary)] font-serif">加载中...</p>
        </div>
      </div>
    );
  }

  if (!activeNetwork) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--primary)] font-serif">初始化网络...</p>
      </div>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-[var(--background)]">
      <Header />

      <LeftSidebar
        isOpen={state.isLeftSidebarOpen}
        networks={state.networks}
        activeNetworkId={activeNetwork.id}
        onToggle={toggleLeftSidebar}
        onCreateNetwork={createNetwork}
        onSwitchNetwork={switchNetwork}
        onDeleteNetwork={deleteNetwork}
        onRenameNetwork={renameNetwork}
      />

      <RightSidebar
        isOpen={state.isRightSidebarOpen}
        background={activeNetwork.background}
        settings={settings}
        onToggle={toggleRightSidebar}
        onBackgroundChange={setBackground}
        onSettingsChange={updateSettings}
      />

      <div className="h-full w-full">
        <ReactFlowProvider>
          <Canvas
            nodes={activeNetwork.nodes}
            edges={activeNetwork.edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onAddWord={addWord}
            onExpandWord={expandWord}
            onOrganizeNetwork={organizeNetwork}
          />
        </ReactFlowProvider>
      </div>

      {/* 空状态提示 */}
      {activeNetwork.nodes.length === 0 && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center max-w-md px-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--muted)] flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[var(--primary-light)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
            </div>
            <h2 className="text-xl font-serif text-[var(--foreground)] mb-3">
              开始探索词语的迷宫
            </h2>
            <p className="text-[var(--primary)] font-serif leading-relaxed">
              点击画布上的任意位置，输入一个词语或概念，开始你的符号学之旅。
            </p>
          </div>
        </div>
      )}

      <StorageUsageBar />
    </main>
  );
}
