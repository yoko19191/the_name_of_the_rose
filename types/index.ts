import type { Node, Edge } from '@xyflow/react';

// 词语节点数据
export interface WordNodeData extends Record<string, unknown> {
  word: string;
  explanation: string | null;
  isLoading: boolean;
  isExpanded: boolean;
  isNew?: boolean; // 新生成的节点，用于高亮显示
}

// React Flow 节点类型
export type WordNode = Node<WordNodeData, 'wordNode'>;

// React Flow 边类型
export type WordEdge = Edge<{ label?: string }>;

// 词语网络
export interface WordNetwork {
  id: string;
  name: string;
  background: string;
  nodes: WordNode[];
  edges: WordEdge[];
  createdAt: number;
  updatedAt: number;
}

// 模型提供商类型
export type ModelProvider = 'openai' | 'anthropic';

// 设置
export interface Settings {
  modelName: string;
  provider: ModelProvider;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  anthropicApiKey?: string;
  anthropicBaseUrl?: string;
  // 兼容旧版本配置
  apiKey?: string;
  baseUrl?: string;
}

// 应用状态
export interface AppState {
  networks: WordNetwork[];
  activeNetworkId: string | null;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  settings: Settings;
}

// AI 生成请求
export interface GenerateRequest {
  action: 'words' | 'explanation';
  word: string;
  background: string;
  existingWords?: string[];
  context?: string[];
  direction?: string;
  modelName?: string;
  provider?: ModelProvider;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  anthropicApiKey?: string;
  anthropicBaseUrl?: string;
  // 兼容旧版本请求字段
  apiKey?: string;
  baseUrl?: string;
}

// 生成解释词响应
export interface GenerateWordsResponse {
  relatedWords: Array<{
    word: string;
    briefExplanation: string;
  }>;
}

// 生成完整解释响应
export interface GenerateExplanationResponse {
  explanation: string;
}

// 预设模型配置
export interface PresetModel {
  id: string;
  name: string;
  provider: ModelProvider;
}
