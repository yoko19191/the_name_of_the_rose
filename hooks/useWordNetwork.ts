'use client';

import { useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
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
const LAYOUT_TICKS = 280;
const LAYOUT_RING_START = 190;
const LAYOUT_RING_GAP = 165;

interface LayoutSimulationNode extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  depth: number;
}

interface LayoutSimulationLink extends SimulationLinkDatum<LayoutSimulationNode> {
  source: string;
  target: string;
}

const getRingRadius = (depth: number) => {
  if (depth <= 0) return 0;
  return LAYOUT_RING_START + (depth - 1) * LAYOUT_RING_GAP;
};

const edgePairKey = (a: string, b: string) => {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
};

const getLinkNodeId = (value: string | LayoutSimulationNode) => {
  return typeof value === 'string' ? value : value.id;
};

// 力导向布局算法 - 分层径向 + 力学微调（首节点为中心）
function forceDirectedLayout(nodes: WordNode[], edges: WordEdge[]): WordNode[] {
  if (nodes.length === 0) return nodes;

  const firstNodeId = nodes[0].id;
  const validNodeIds = new Set(nodes.map((node) => node.id));

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

  const currentAngleMap = new Map(
    nodes.map((node) => [
      node.id,
      Math.atan2(node.position.y - LAYOUT_CENTER.y, node.position.x - LAYOUT_CENTER.x),
    ])
  );

  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const link of simulationLinks) {
    adjacency.get(link.source)?.push(link.target);
    adjacency.get(link.target)?.push(link.source);
  }
  for (const [nodeId, neighbors] of adjacency.entries()) {
    neighbors.sort((a, b) => (currentAngleMap.get(a) ?? 0) - (currentAngleMap.get(b) ?? 0));
    adjacency.set(nodeId, neighbors);
  }

  // 1) 以首节点为根做 BFS 分层，建立“由中心向外扩展”的层级结构
  const depthMap = new Map<string, number>();
  const parentMap = new Map<string, string | null>();
  const childrenMap = new Map<string, string[]>();
  for (const node of nodes) {
    childrenMap.set(node.id, []);
  }

  depthMap.set(firstNodeId, 0);
  parentMap.set(firstNodeId, null);
  const queue = [firstNodeId];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    const currentDepth = depthMap.get(current) ?? 0;
      const neighbors = adjacency.get(current) || [];
      for (const next of neighbors) {
      if (depthMap.has(next)) continue;
      depthMap.set(next, currentDepth + 1);
      parentMap.set(next, current);
      childrenMap.get(current)?.push(next);
      queue.push(next);
    }
  }

  const connectedMaxDepth = Math.max(...Array.from(depthMap.values()));
  const disconnectedIds: string[] = [];
  for (const node of nodes) {
    if (!depthMap.has(node.id)) {
      depthMap.set(node.id, connectedMaxDepth + 1);
      parentMap.set(node.id, null);
      disconnectedIds.push(node.id);
    }
  }

  const treeEdgePairSet = new Set<string>();
  for (const [nodeId, parentId] of parentMap.entries()) {
    if (!parentId) continue;
    treeEdgePairSet.add(edgePairKey(nodeId, parentId));
  }

  // 2) 计算子树权重，用于扇区分配（尽量降低交叉）
  const subtreeWeight = new Map<string, number>();
  const calcSubtreeWeight = (nodeId: string): number => {
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) {
      subtreeWeight.set(nodeId, 1);
      return 1;
    }
    let total = 0;
    for (const childId of children) {
      total += calcSubtreeWeight(childId);
    }
    const weight = Math.max(1, total);
    subtreeWeight.set(nodeId, weight);
    return weight;
  };
  calcSubtreeWeight(firstNodeId);

  // 3) 递归分配角度区间，让每个子树占据连续扇区
  const angleMap = new Map<string, number>();
  const assignAngles = (nodeId: string, start: number, end: number) => {
    const angle = (start + end) / 2;
    angleMap.set(nodeId, angle);

    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;

    const totalWeight = children.reduce((sum, childId) => sum + (subtreeWeight.get(childId) ?? 1), 0);
    let cursor = start;
    for (const childId of children) {
      const ratio = (subtreeWeight.get(childId) ?? 1) / totalWeight;
      const span = (end - start) * ratio;
      assignAngles(childId, cursor, cursor + span);
      cursor += span;
    }
  };
  const startAngle = -Math.PI / 2;
  assignAngles(firstNodeId, startAngle, startAngle + Math.PI * 2);

  // 非连通节点放在最外环，均匀分布
  if (disconnectedIds.length > 0) {
    const outerStart = startAngle + Math.PI / 8;
    const step = (Math.PI * 2) / disconnectedIds.length;
    disconnectedIds.forEach((id, index) => {
      angleMap.set(id, outerStart + step * index);
    });
  }

  const simulationNodes: LayoutSimulationNode[] = nodes.map((node) => {
    const depth = depthMap.get(node.id) ?? 1;
    const angle = angleMap.get(node.id) ?? startAngle;
    const radius = getRingRadius(depth);
    const targetX = LAYOUT_CENTER.x + radius * Math.cos(angle);
    const targetY = LAYOUT_CENTER.y + radius * Math.sin(angle);

    return {
      id: node.id,
      depth,
      targetX,
      targetY,
      x: Number.isFinite(node.position.x) ? node.position.x : targetX,
      y: Number.isFinite(node.position.y) ? node.position.y : targetY,
    };
  });

  const firstNode = simulationNodes.find((node) => node.id === firstNodeId);
  if (firstNode) {
    firstNode.fx = LAYOUT_CENTER.x;
    firstNode.fy = LAYOUT_CENTER.y;
  }

  const simulation = forceSimulation<LayoutSimulationNode>(simulationNodes)
    .force(
      'charge',
      forceManyBody<LayoutSimulationNode>()
        .strength(-360)
        .distanceMin(60)
        .distanceMax(650)
    )
    .force(
      'link',
      forceLink<LayoutSimulationNode, LayoutSimulationLink>(simulationLinks)
        .id((node) => node.id)
        .distance((link) => {
          const sourceId = getLinkNodeId(link.source);
          const targetId = getLinkNodeId(link.target);
          const sourceDepth = depthMap.get(sourceId) ?? 0;
          const targetDepth = depthMap.get(targetId) ?? 0;
          const depthDiff = Math.abs(sourceDepth - targetDepth);
          const isTreeEdge = treeEdgePairSet.has(edgePairKey(sourceId, targetId));
          return isTreeEdge ? 125 + depthDiff * 40 : 240 + depthDiff * 70;
        })
        .strength((link) => {
          const sourceId = getLinkNodeId(link.source);
          const targetId = getLinkNodeId(link.target);
          return treeEdgePairSet.has(edgePairKey(sourceId, targetId)) ? 0.22 : 0.035;
        })
    )
    .force(
      'radial',
      forceRadial<LayoutSimulationNode>(
        (node) => getRingRadius(node.depth),
        LAYOUT_CENTER.x,
        LAYOUT_CENTER.y
      ).strength(0.34)
    )
    .force('collide', forceCollide<LayoutSimulationNode>().radius(74).strength(1).iterations(3))
    .force('x', forceX<LayoutSimulationNode>((node) => node.targetX).strength(0.25))
    .force('y', forceY<LayoutSimulationNode>((node) => node.targetY).strength(0.25))
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
        x: Number.isFinite(node.x) ? node.x : node.targetX,
        y: Number.isFinite(node.y) ? node.y : node.targetY,
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
          isNew: false,
        },
      };

      // 先添加节点
      setState((prev) => ({
        ...prev,
        activeNetworkId: network.id,
        networks: prev.networks.map((n) =>
          n.id === network.id
            ? {
                ...n,
                // 约定：第一个词语自动成为网络名
                ...(isFirstNode ? { name: word } : {}),
                nodes: [...n.nodes, newNode],
                updatedAt: Date.now(),
              }
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

      return nodeId;
    },
    [activeNetworkId, setState]
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

      // 触发新一轮概念生成时，清除上一轮高亮并标记当前节点加载中
      setState((prev) => ({
        ...prev,
        networks: prev.networks.map((n) =>
          n.id === network.id
            ? {
                ...n,
                nodes: n.nodes.map((nd) =>
                  nd.id === nodeId
                    ? { ...nd, data: { ...nd.data, isLoading: true, isNew: false } }
                    : nd.data.isNew
                      ? { ...nd, data: { ...nd.data, isNew: false } }
                      : nd
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
        const edgeUpdates = new Map<
          string,
          {
            source: string;
            target: string;
            predicate: string;
            predicateReason: string;
          }
        >();

        for (let i = 0; i < responseData.relatedWords.length; i++) {
          const relatedWord = responseData.relatedWords[i];
          const newConcept = relatedWord.newConcept.trim();
          if (!newConcept) continue;
          const predicate = relatedWord.predicate.trim() || '关联';
          const predicateReason = relatedWord.predicateReason.trim() || '该谓词用于揭示两者的核心联系。';
          const briefExplanation = relatedWord.briefExplanation.trim() || `${newConcept}可用于解释${node.data.word}。`;

          // 检查词语是否已存在
          const existingNode = latestNetwork.nodes.find((n) => n.data.word === newConcept);

          if (existingNode) {
            const edgeId = `${existingNode.id}-${nodeId}`;
            const existingEdge = latestNetwork.edges.find(
              (e) => (e.source === existingNode.id && e.target === nodeId) ||
                     (e.source === nodeId && e.target === existingNode.id)
            );
            if (!existingEdge) {
              newEdges.push({
                id: edgeId,
                source: existingNode.id,
                target: nodeId,
                data: {
                  label: predicate,
                  predicate,
                  predicateReason,
                },
              });
            } else {
              edgeUpdates.set(existingEdge.id, {
                source: existingNode.id,
                target: nodeId,
                predicate,
                predicateReason,
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
                word: newConcept,
                explanation: briefExplanation,
                isLoading: false,
                isExpanded: false,
                isNew: true,
              },
            });

            newEdges.push({
              id: `${newNodeId}-${nodeId}`,
              source: newNodeId,
              target: nodeId,
              data: {
                label: predicate,
                predicate,
                predicateReason,
              },
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
                  edges: [
                    ...n.edges.map((edge) => {
                      const update = edgeUpdates.get(edge.id);
                      if (!update) return edge;
                      return {
                        ...edge,
                        source: update.source,
                        target: update.target,
                        data: {
                          ...(edge.data || {}),
                          label: update.predicate,
                          predicate: update.predicate,
                          predicateReason: update.predicateReason,
                        },
                      };
                    }),
                    ...newEdges,
                  ],
                  updatedAt: Date.now(),
                }
              : n
          ),
        }));
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
    [activeNetworkId, setState]
  );

  // 整理网络布局
  const organizeNetwork = useCallback(() => {
    const currentState = stateRef.current;
    const network = currentState.networks.find((n) => n.id === activeNetworkId) || currentState.networks[0];
    if (!network || network.nodes.length === 0) return null;

    const organizedNodes = forceDirectedLayout(network.nodes, network.edges);
    const firstNode = organizedNodes[0];

    setState((prev) => ({
      ...prev,
      networks: prev.networks.map((n) =>
        n.id === network.id
          ? { ...n, nodes: organizedNodes, updatedAt: Date.now() }
          : n
      ),
    }));

    if (!firstNode) return null;
    return {
      id: firstNode.id,
      x: firstNode.position.x,
      y: firstNode.position.y,
    };
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
