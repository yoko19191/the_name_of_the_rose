'use client';

import { useState, useEffect } from 'react';
import type { Settings, ModelProvider } from '@/types';

const PROVIDER_OPTIONS: { value: ModelProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI 兼容' },
  { value: 'anthropic', label: 'Anthropic 兼容' },
];

interface RightSidebarProps {
  isOpen: boolean;
  background: string;
  settings: Settings;
  onToggle: () => void;
  onBackgroundChange: (background: string) => void;
  onSettingsChange: (settings: Partial<Settings>) => void;
}

export function RightSidebar({
  isOpen,
  background,
  settings,
  onToggle,
  onBackgroundChange,
  onSettingsChange,
}: RightSidebarProps) {
  const [localBackground, setLocalBackground] = useState(background);
  const [localModel, setLocalModel] = useState(settings.modelName || 'gpt-5-mini');
  const [localProvider, setLocalProvider] = useState(
    settings.provider === 'anthropic' ? 'anthropic' : 'openai'
  );
  const [localOpenAIApiKey, setLocalOpenAIApiKey] = useState(settings.openaiApiKey || settings.apiKey || '');
  const [localOpenAIBaseUrl, setLocalOpenAIBaseUrl] = useState(settings.openaiBaseUrl || settings.baseUrl || '');
  const [localAnthropicApiKey, setLocalAnthropicApiKey] = useState(settings.anthropicApiKey || '');
  const [localAnthropicBaseUrl, setLocalAnthropicBaseUrl] = useState(settings.anthropicBaseUrl || '');

  useEffect(() => {
    setLocalBackground(background);
  }, [background]);

  useEffect(() => {
    setLocalModel(settings.modelName || 'gpt-5-mini');
    setLocalProvider(settings.provider === 'anthropic' ? 'anthropic' : 'openai');
    setLocalOpenAIApiKey(settings.openaiApiKey || settings.apiKey || '');
    setLocalOpenAIBaseUrl(settings.openaiBaseUrl || settings.baseUrl || '');
    setLocalAnthropicApiKey(settings.anthropicApiKey || '');
    setLocalAnthropicBaseUrl(settings.anthropicBaseUrl || '');
  }, [
    settings.modelName,
    settings.provider,
    settings.openaiApiKey,
    settings.openaiBaseUrl,
    settings.anthropicApiKey,
    settings.anthropicBaseUrl,
    settings.apiKey,
    settings.baseUrl,
  ]);

  const handleBackgroundBlur = () => {
    if (localBackground !== background) {
      onBackgroundChange(localBackground);
    }
  };

  const handleProviderChange = (value: string) => {
    setLocalProvider(value as ModelProvider);
    onSettingsChange({ provider: value as ModelProvider });
  };

  const handleModelSave = () => {
    if (localModel.trim()) {
      const nextModel = localModel.trim();
      setLocalModel(nextModel);
      if (nextModel !== settings.modelName) {
        onSettingsChange({ modelName: nextModel });
      }
    }
  };

  const handleSettingBlur = (key: keyof Settings, value: string) => {
    const currentValue = (settings[key] as string | undefined) || '';
    if (value !== currentValue) {
      onSettingsChange({ [key]: value } as Partial<Settings>);
    }
  };

  return (
    <>
      {/* 切换按钮 */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="
            fixed right-4 top-4 z-50
            w-10 h-10 rounded-lg
            bg-[var(--node-bg)] border border-[var(--node-border)]
            shadow-md hover:shadow-lg
            flex items-center justify-center
            transition-all duration-200
            hover:bg-[var(--node-hover)]
          "
          title="设置"
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
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.275c.066.39.287.735.613.95.318.21.708.282 1.077.198l1.2-.27c.532-.12 1.08.082 1.403.52l1.296 1.794c.323.438.365 1.012.107 1.492l-.582 1.08a1.125 1.125 0 000 1.042l.582 1.08c.258.48.216 1.054-.107 1.492l-1.296 1.794a1.125 1.125 0 01-1.403.52l-1.2-.27a1.125 1.125 0 00-1.077.198 1.125 1.125 0 00-.613.95l-.213 1.275a1.125 1.125 0 01-1.11.94h-2.593a1.125 1.125 0 01-1.11-.94l-.213-1.275a1.125 1.125 0 00-.613-.95 1.125 1.125 0 00-1.077-.198l-1.2.27a1.125 1.125 0 01-1.403-.52l-1.296-1.794a1.125 1.125 0 01-.107-1.492l.582-1.08a1.125 1.125 0 000-1.042l-.582-1.08a1.125 1.125 0 01.107-1.492l1.296-1.794a1.125 1.125 0 011.403-.52l1.2.27c.37.084.76.012 1.077-.198.326-.215.547-.56.613-.95l.213-1.275z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
            />
          </svg>
        </button>
      )}

      {/* 遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onToggle}
        />
      )}

      {/* 侧边栏 */}
      <div
        className={`
          fixed right-0 top-0 h-full w-80 z-40
          bg-[var(--background)] border-l border-[var(--border)]
          shadow-xl overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'}
        `}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-serif text-[var(--foreground)]">设置</h2>
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

          <div className="space-y-6">
            {/* Provider 选择 */}
            <div>
              <label className="block text-sm text-[var(--primary)] mb-2 font-serif">
                API 提供商
              </label>
              <select
                value={localProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-[var(--node-bg)] border border-[var(--border)]
                  text-[var(--foreground)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
                  font-serif text-sm
                "
              >
                {PROVIDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[var(--primary-light)] font-serif">
                {localProvider === 'anthropic' ? 'Anthropic API' : 'OpenAI 兼容 API'}
              </p>
            </div>

            {/* 模型输入 */}
            <div>
              <label className="block text-sm text-[var(--primary)] mb-2 font-serif">
                AI 模型
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  onBlur={handleModelSave}
                  placeholder={localProvider === 'anthropic' ? '例如: claude-3-7-sonnet-20250228' : '例如: gpt-5-mini'}
                  className="
                    flex-1 px-3 py-2 rounded-lg
                    bg-[var(--node-bg)] border border-[var(--border)]
                    text-[var(--foreground)] placeholder:text-[var(--primary-light)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
                    font-serif text-sm
                  "
                />
                <button
                  onClick={handleModelSave}
                  className="
                    px-3 py-2 rounded-lg
                    bg-[var(--primary)] text-[var(--background)]
                    hover:bg-[var(--accent)]
                    font-serif text-sm
                    transition-colors
                  "
                >
                  保存
                </button>
              </div>
              <p className="mt-1 text-xs text-[var(--primary-light)] font-serif">
                当前: {settings.modelName || '未设置'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--primary-light)] font-serif">
                API 提供商控制 ModelProvider，AI 模型控制 Model。
              </p>
            </div>

            {/* 背景上下文 */}
            <div>
              <label className="block text-sm text-[var(--primary)] mb-2 font-serif">
                背景上下文
              </label>
              <textarea
                value={localBackground}
                onChange={(e) => setLocalBackground(e.target.value)}
                onBlur={handleBackgroundBlur}
                placeholder="输入背景信息，AI 将参考此内容生成更相关的解释词..."
                rows={5}
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-[var(--node-bg)] border border-[var(--border)]
                  text-[var(--foreground)] placeholder:text-[var(--primary-light)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
                  font-serif text-sm leading-relaxed
                  resize-none
                "
              />
            </div>

            {/* OpenAI 配置 */}
            <div className="pt-4 border-t border-[var(--border)] space-y-3">
              <h3 className="text-sm text-[var(--primary)] font-serif">OpenAI 覆盖配置</h3>
              <input
                type="password"
                value={localOpenAIApiKey}
                onChange={(e) => setLocalOpenAIApiKey(e.target.value)}
                onBlur={() => handleSettingBlur('openaiApiKey', localOpenAIApiKey)}
                placeholder="OPENAI API KEY（留空则使用环境变量）"
                autoComplete="off"
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-[var(--node-bg)] border border-[var(--border)]
                  text-[var(--foreground)] placeholder:text-[var(--primary-light)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
                  font-serif text-sm
                "
              />
              <input
                type="text"
                value={localOpenAIBaseUrl}
                onChange={(e) => setLocalOpenAIBaseUrl(e.target.value)}
                onBlur={() => handleSettingBlur('openaiBaseUrl', localOpenAIBaseUrl)}
                placeholder="OPENAI BASE URL（可选）"
                autoComplete="off"
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-[var(--node-bg)] border border-[var(--border)]
                  text-[var(--foreground)] placeholder:text-[var(--primary-light)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
                  font-serif text-sm
                "
              />
            </div>

            {/* Anthropic 配置 */}
            <div className="pt-4 border-t border-[var(--border)] space-y-3">
              <h3 className="text-sm text-[var(--primary)] font-serif">Anthropic 覆盖配置</h3>
              <input
                type="password"
                value={localAnthropicApiKey}
                onChange={(e) => setLocalAnthropicApiKey(e.target.value)}
                onBlur={() => handleSettingBlur('anthropicApiKey', localAnthropicApiKey)}
                placeholder="ANTHROPIC API KEY（留空则使用环境变量）"
                autoComplete="off"
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-[var(--node-bg)] border border-[var(--border)]
                  text-[var(--foreground)] placeholder:text-[var(--primary-light)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
                  font-serif text-sm
                "
              />
              <input
                type="text"
                value={localAnthropicBaseUrl}
                onChange={(e) => setLocalAnthropicBaseUrl(e.target.value)}
                onBlur={() => handleSettingBlur('anthropicBaseUrl', localAnthropicBaseUrl)}
                placeholder="ANTHROPIC BASE URL（可选）"
                autoComplete="off"
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-[var(--node-bg)] border border-[var(--border)]
                  text-[var(--foreground)] placeholder:text-[var(--primary-light)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
                  font-serif text-sm
                "
              />
            </div>

            {/* 使用提示 */}
            <div className="pt-4 border-t border-[var(--border)]">
              <h3 className="text-sm text-[var(--primary)] mb-3 font-serif">使用提示</h3>
              <ul className="space-y-2 text-xs text-[var(--primary-light)] font-serif">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent)]">•</span>
                  <span>白板为空时，点击空白处添加首个词语</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent)]">•</span>
                  <span>右键点击词语可选择展开方向</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent)]">•</span>
                  <span>右键点击空白处整理网络布局</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent)]">•</span>
                  <span>悬浮词语查看完整解释</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent)]">•</span>
                  <span>已展开的词语变为灰色，无法再次展开</span>
                </li>
              </ul>
            </div>

            {/* 项目地址 */}
            <div className="pt-4 border-t border-[var(--border)]">
              <h3 className="text-sm text-[var(--primary)] mb-2 font-serif">项目仓库</h3>
              <a
                href="https://github.com/yoko19191/the_name_of_the_rose"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  block text-xs font-serif break-all
                  text-[var(--accent)] hover:underline
                "
              >
                https://github.com/yoko19191/the_name_of_the_rose
              </a>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
