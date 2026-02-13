'use client';

import { useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { useLocalStorage } from './useLocalStorage';
import type { WordNode, WordEdge, WordNetwork, AppState, GenerateWordsResponse, Settings, ModelProvider } from '@/types';

const getDefaultSettings = (providerOverride?: ModelProvider): Settings => ({
  modelName: 'gpt-5-mini',
  provider: providerOverride || 'openai',
  openaiApiKey: '',
  openaiBaseUrl: '',
  anthropicApiKey: '',
  anthropicBaseUrl: '',
  apiKey: '',
  baseUrl: '',
});

function normalizeSettings(settings?: Partial<Settings>): Settings {
  const defaults = getDefaultSettings();
  const merged = { ...defaults, ...(settings || {}) };

  if (merged.provider !== 'openai' && merged.provider !== 'anthropic') {
    merged.provider = 'openai';
  }
  if (!merged.modelName) {
    merged.modelName = 'gpt-5-mini';
  }

  // 兼容旧版本：把通用 apiKey/baseUrl 迁移为 OpenAI 配置
  if (!merged.openaiApiKey && merged.apiKey) {
    merged.openaiApiKey = merged.apiKey;
  }
  if (!merged.openaiBaseUrl && merged.baseUrl) {
    merged.openaiBaseUrl = merged.baseUrl;
  }

  return merged;
}

const createInitialNetwork = (): WordNetwork => ({
  id: nanoid(),
  name: '新网络',
  background: '',
  nodes: [],
  edges: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const getInitialState = (): AppState => {
  return {
    networks: [createInitialNetwork()],
    activeNetworkId: null,
    isLeftSidebarOpen: false,
    isRightSidebarOpen: false,
    settings: {
      modelName: 'gpt-5-mini',
      provider: 'openai',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      openaiBaseUrl: process.env.OPENAI_BASE_URL || '',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL || '',
      apiKey: '',
      baseUrl: '',
    },
  };
};

const initialState = getInitialState();

const LAYOUT_CENTER = { x: 400, y: 300 };
const LAYOUT_TICKS = 220;

interface LayoutSimulationNode extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
}

interface LayoutSimulationLink extends SimulationLinkDatum<LayoutSimulationNode> {
  source: string;
  target: string;
}

// 力导向布局算法 - 用于整理网络
function forceDirectedLayout(nodes: WordNode[], edges: WordEdge[]): WordNode[] {
  if (nodes.length === 0) return nodes;

  const firstNodeId = nodes[0].id;
  const validNodeIds = new Set(nodes.map((node) => node.id));

  const simulationNodes: LayoutSimulationNode[] = nodes.map((node) => ({
    id: node.id,
    x: Number.isFinite(node.position.x) ? node.position.x : LAYOUT_CENTER.x,
    y: Number.isFinite(node.position.y) ? node.position.y : LAYOUT_CENTER.y,
  }));

  const simulationLinks: LayoutSimulationLink[] = edges
    .filter(
      (edge) =>
        validNodeIds.has(edge.source) &&
        validNodeIds.has(edge.target) &&
        edge.source !== edge.target
    )
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
    }));

  const firstNode = simulationNodes.find((node) => node.id === firstNodeId);
  if (firstNode) {
    firstNode.fx = LAYOUT_CENTER.x;
    firstNode.fy = LAYOUT_CENTER.y;
  }

  const simulation = forceSimulation<LayoutSimulationNode>(simulationNodes)
    .force(
      'charge',
      forceManyBody<LayoutSimulationNode>()
        .strength(-900)
        .distanceMin(60)
        .distanceMax(700)
    )
    .force(
      'link',
      forceLink<LayoutSimulationNode, LayoutSimulationLink>(simulationLinks)
        .id((node) => node.id)
        .distance(190)
        .strength(0.22)
    )
    .force('center', forceCenter(LAYOUT_CENTER.x, LAYOUT_CENTER.y))
    .force('collide', forceCollide<LayoutSimulationNode>().radius(78).strength(1).iterations(2))
    .force('x', forceX<LayoutSimulationNode>(LAYOUT_CENTER.x).strength(0.03))
    .force('y', forceY<LayoutSimulationNode>(LAYOUT_CENTER.y).strength(0.03))
    .alpha(1)
    .alphaMin(0.001);

  for (let i = 0; i < LAYOUT_TICKS; i++) {
    simulation.tick();
  }
  simulation.stop();

  if (firstNode) {
    firstNode.x = LAYOUT_CENTER.x;
    firstNode.y = LAYOUT_CENTER.y;
    firstNode.fx = undefined;
    firstNode.fy = undefined;
  }

  const nodePositionMap = new Map(
    simulationNodes.map((node) => [
      node.id,
      {
        x: node.x,
        y: node.y,
      },
    ])
  );

  return nodes.map((node) => ({
    ...node,
    position: nodePositionMap.get(node.id) || node.position,
  }));
}

// 计算新节点位置（环形布局）
function calculateNewNodePosition(
  parentPosition: { x: number; y: number },
  existingNodes: WordNode[],
  index: number,
  total: number
): { x: number; y: number } {
  const radius = 180;
  const angleStep = (2 * Math.PI) / Math.max(total, 3);
  const baseAngle = -Math.PI / 2;
  const angle = baseAngle + angleStep * index;

  let x = parentPosition.x + radius * Math.cos(angle);
  let y = parentPosition.y + radius * Math.sin(angle);

  const nodeSize = 100;
  for (const node of existingNodes) {
    const dx = x - node.position.x;
    const dy = y - node.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < nodeSize) {
      x += (dx / distance) * (nodeSize - distance + 20);
      y += (dy / distance) * (nodeSize - distance + 20);
    }
  }

  return { x, y };
}

export function useWordNetwork() {
  const [state, setState, isLoaded] = useLocalStorage<AppState>('rose-networks', initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 确保 settings 存在
  const settings = normalizeSettings(state.settings);

  // 确保有活跃网络
  const activeNetworkId = state.activeNetworkId || state.networks[0]?.id || null;
  const activeNetwork = state.networks.find((n) => n.id === activeNetworkId) || state.networks[0];

  // 清除新节点高亮标记
  const clearNewFlags = useCallback(
    (networkId: string) => {
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          networks: prev.networks.map((n) =>
            n.id === networkId
              ? {
                  ...n,
                  nodes: n.nodes.map((node) => ({ ...node, data: { ...node.data, isNew: false } })),
                }
              : n
          ),
        }));
      }, 3000);
    },
    [setState]
  );

  // 添加新词语
  const addWord = useCallback(
    async (word: string, position: { x: number; y: number }) => {
      const currentState = stateRef.current;
      const currentSettings = normalizeSettings(currentState.settings);
      const network = currentState.networks.find((n) => n.id === activeNetworkId) || currentState.networks[0];
      if (!network) return;

      // 检查词语是否已存在
      const existingNode = network.nodes.find((n) => n.data.word === word);
      if (existingNode) {
        return existingNode.id;
      }

      const nodeId = nanoid();
      const isFirstNode = network.nodes.length === 0;
      const newNode: WordNode = {
        id: nodeId,
        type: 'wordNode',
        position: isFirstNode ? LAYOUT_CENTER : position,
        data: {
          word,
          explanation: null,
          isLoading: true,
          isExpanded: false,
          isNew: true,
        },
      };

      // 先添加节点
      setState((prev) => ({
        ...prev,
        activeNetworkId: network.id,
        networks: prev.networks.map((n) =>
          n.id === network.id
            ? { ...n, nodes: [...n.nodes, newNode], updatedAt: Date.now() }
            : n
        ),
      }));

      // 获取完整解释
      try {
        const existingWords = network.nodes.map((n) => n.data.word);
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'explanation',
            word,
            background: network.background,
            context: existingWords.slice(0, 5),
            modelName: currentSettings.modelName,
            provider: currentSettings.provider,
            openaiApiKey: currentSettings.openaiApiKey,
            openaiBaseUrl: currentSettings.openaiBaseUrl,
            anthropicApiKey: currentSettings.anthropicApiKey,
            anthropicBaseUrl: currentSettings.anthropicBaseUrl,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '请求失败');
        }

        setState((prev) => ({
          ...prev,
          networks: prev.networks.map((n) =>
            n.id === network.id
              ? {
                  ...n,
                  nodes: n.nodes.map((node) =>
                    node.id === nodeId
                      ? { ...node, data: { ...node.data, explanation: data.explanation || '暂无解释', isLoading: false } }
                      : node
                  ),
                }
              : n
          ),
        }));
      } catch (error) {
        console.error('获取解释失败:', error);
        // 即使失败也保留节点
        setState((prev) => ({
          ...prev,
          networks: prev.networks.map((n) =>
            n.id === network.id
              ? {
                  ...n,
                  nodes: n.nodes.map((node) =>
                    node.id === nodeId
                      ? { ...node, data: { ...node.data, explanation: '点击展开查看相关概念', isLoading: false } }
                      : node
                  ),
                }
              : n
          ),
        }));
      }

      clearNewFlags(network.id);
      return nodeId;
    },
    [activeNetworkId, setState, clearNewFlags]
  );

  // 展开词语（生成子节点）- 支持方向控制
  const expandWord = useCallback(
    async (nodeId: string, direction?: string) => {
      const currentState = stateRef.current;
      const currentSettings = normalizeSettings(currentState.settings);
      const network = currentState.networks.find((n) => n.id === activeNetworkId) || currentState.networks[0];
      if (!network) return;

      const node = network.nodes.find((n) => n.id === nodeId);
      if (!node || node.data.isExpanded || node.data.isLoading) return;

      const existingWords = network.nodes.map((n) => n.data.word);

      // 标记为加载中
      setState((prev) => ({
        ...prev,
        networks: prev.networks.map((n) =>
          n.id === network.id
            ? {
                ...n,
                nodes: n.nodes.map((nd) =>
                  nd.id === nodeId ? { ...nd, data: { ...nd.data, isLoading: true } } : nd
                ),
              }
            : n
        ),
      }));

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'words',
            word: node.data.word,
            background: network.background,
            existingWords,
            direction, // 传递方向控制参数
            modelName: currentSettings.modelName,
            provider: currentSettings.provider,
            openaiApiKey: currentSettings.openaiApiKey,
            openaiBaseUrl: currentSettings.openaiBaseUrl,
            anthropicApiKey: currentSettings.anthropicApiKey,
            anthropicBaseUrl: currentSettings.anthropicBaseUrl,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '请求失败');
        }

        const responseData = data as GenerateWordsResponse;

        if (!responseData.relatedWords || responseData.relatedWords.length === 0) {
          throw new Error('未生成相关词语');
        }

        // 重新获取最新状态
        const latestState = stateRef.current;
        const latestNetwork = latestState.networks.find((n) => n.id === network.id);
        if (!latestNetwork) return;

        const newNodes: WordNode[] = [];
        const newEdges: WordEdge[] = [];

        for (let i = 0; i < responseData.relatedWords.length; i++) {
          const relatedWord = responseData.relatedWords[i];

          // 检查词语是否已存在
          const existingNode = latestNetwork.nodes.find((n) => n.data.word === relatedWord.word);

          if (existingNode) {
            const edgeId = `${nodeId}-${existingNode.id}`;
            const edgeExists = latestNetwork.edges.some(
              (e) => (e.source === nodeId && e.target === existingNode.id) ||
                     (e.source === existingNode.id && e.target === nodeId)
            );
            if (!edgeExists) {
              newEdges.push({
                id: edgeId,
                source: nodeId,
                target: existingNode.id,
              });
            }
          } else {
            const newNodeId = nanoid();
            const position = calculateNewNodePosition(
              node.position,
              [...latestNetwork.nodes, ...newNodes],
              i,
              responseData.relatedWords.length
            );

            newNodes.push({
              id: newNodeId,
              type: 'wordNode',
              position,
              data: {
                word: relatedWord.word,
                explanation: relatedWord.briefExplanation,
                isLoading: false,
                isExpanded: false,
                isNew: true,
              },
            });

            newEdges.push({
              id: `${nodeId}-${newNodeId}`,
              source: nodeId,
              target: newNodeId,
            });
          }
        }

        setState((prev) => ({
          ...prev,
          networks: prev.networks.map((n) =>
            n.id === network.id
              ? {
                  ...n,
                  nodes: [
                    ...n.nodes.map((nd) =>
                      nd.id === nodeId
                        ? { ...nd, data: { ...nd.data, isLoading: false, isExpanded: true } }
                        : nd
                    ),
                    ...newNodes,
                  ],
                  edges: [...n.edges, ...newEdges],
                  updatedAt: Date.now(),
                }
              : n
          ),
        }));

        clearNewFlags(network.id);
      } catch (error) {
        console.error('展开词语失败:', error);
        setState((prev) => ({
          ...prev,
          networks: prev.networks.map((n) =>
            n.id === network.id
              ? {
                  ...n,
                  nodes: n.nodes.map((nd) =>
                    nd.id === nodeId ? { ...nd, data: { ...nd.data, isLoading: false } } : nd
                  ),
                }
              : n
          ),
        }));
      }
    },
    [activeNetworkId, setState, clearNewFlags]
  );

  // 整理网络布局
  const organizeNetwork = useCallback(() => {
    const currentState = stateRef.current;
    const network = currentState.networks.find((n) => n.id === activeNetworkId) || currentState.networks[0];
    if (!network || network.nodes.length === 0) return;

    const organizedNodes = forceDirectedLayout(network.nodes, network.edges);

    setState((prev) => ({
      ...prev,
      networks: prev.networks.map((n) =>
        n.id === network.id
          ? { ...n, nodes: organizedNodes, updatedAt: Date.now() }
          : n
      ),
    }));
  }, [activeNetworkId, setState]);

  // 更新背景
  const setBackground = useCallback(
    (background: string) => {
      setState((prev) => ({
        ...prev,
        networks: prev.networks.map((n) =>
          n.id === activeNetworkId ? { ...n, background, updatedAt: Date.now() } : n
        ),
      }));
    },
    [activeNetworkId, setState]
  );

  // 更新设置
  const updateSettings = useCallback(
    (newSettings: Partial<Settings>) => {
      setState((prev) => ({
        ...prev,
        settings: normalizeSettings({ ...(prev.settings || getDefaultSettings()), ...newSettings }),
      }));
    },
    [setState]
  );

  // 创建新网络
  const createNetwork = useCallback(
    (name: string) => {
      const newNetwork = { ...createInitialNetwork(), name };
      setState((prev) => ({
        ...prev,
        networks: [...prev.networks, newNetwork],
        activeNetworkId: newNetwork.id,
      }));
    },
    [setState]
  );

  // 切换网络
  const switchNetwork = useCallback(
    (networkId: string) => {
      setState((prev) => ({ ...prev, activeNetworkId: networkId }));
    },
    [setState]
  );

  // 删除网络
  const deleteNetwork = useCallback(
    (networkId: string) => {
      setState((prev) => {
        const newNetworks = prev.networks.filter((n) => n.id !== networkId);
        if (newNetworks.length === 0) {
          newNetworks.push(createInitialNetwork());
        }
        return {
          ...prev,
          networks: newNetworks,
          activeNetworkId: prev.activeNetworkId === networkId ? newNetworks[0].id : prev.activeNetworkId,
        };
      });
    },
    [setState]
  );

  // 重命名网络
  const renameNetwork = useCallback(
    (networkId: string, name: string) => {
      setState((prev) => ({
        ...prev,
        networks: prev.networks.map((n) => (n.id === networkId ? { ...n, name } : n)),
      }));
    },
    [setState]
  );

  // 切换侧边栏
  const toggleLeftSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, isLeftSidebarOpen: !prev.isLeftSidebarOpen }));
  }, [setState]);

  const toggleRightSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, isRightSidebarOpen: !prev.isRightSidebarOpen }));
  }, [setState]);

  return {
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
  };
}
