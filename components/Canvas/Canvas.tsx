'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
  type EdgeTypes,
  type DefaultEdgeOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { WordNode } from './WordNode';
import { PredicateEdge } from './PredicateEdge';
import { InputPopover } from './InputPopover';
import { ContextMenu } from './ContextMenu';
import type { WordNode as WordNodeType, WordEdge, WordEdgeData } from '@/types';

interface CanvasProps {
  nodes: WordNodeType[];
  edges: WordEdge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onAddWord: (word: string, position: { x: number; y: number }) => void;
  onExpandWord: (nodeId: string, direction?: string) => void;
  onOrganizeNetwork: () => { id: string; x: number; y: number } | null;
}

const nodeTypes: NodeTypes = {
  wordNode: WordNode,
};

const edgeTypes: EdgeTypes = {
  predicateEdge: PredicateEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'straight',
  style: { stroke: 'var(--edge-color)', strokeWidth: 1.5 },
  animated: false,
};

// 网格背景样式
const gridBackgroundClassName = 'grid-background';

function withRootFlag(nodes: WordNodeType[]): WordNodeType[] {
  return nodes.map((node, index) => ({
    ...node,
    data: {
      ...node.data,
      isRoot: index === 0,
    },
  }));
}

function getTreeEdgeIds(nodes: WordNodeType[], edges: WordEdge[]): Set<string> {
  if (nodes.length === 0 || edges.length === 0) return new Set();

  const rootId = nodes[0].id;
  const validNodeIds = new Set(nodes.map((node) => node.id));
  const adjacency = new Map<string, Array<{ neighborId: string; edgeId: string }>>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    if (!validNodeIds.has(edge.source) || !validNodeIds.has(edge.target)) continue;
    if (edge.source === edge.target) continue;
    adjacency.get(edge.source)?.push({ neighborId: edge.target, edgeId: edge.id });
    adjacency.get(edge.target)?.push({ neighborId: edge.source, edgeId: edge.id });
  }

  const treeEdgeIds = new Set<string>();
  const visited = new Set<string>([rootId]);
  const queue = [rootId];
  const nodeOrder = new Map(nodes.map((node, index) => [node.id, index]));

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    const neighbors = adjacency.get(current) || [];
    neighbors.sort(
      (a, b) =>
        (nodeOrder.get(a.neighborId) ?? Number.MAX_SAFE_INTEGER) -
        (nodeOrder.get(b.neighborId) ?? Number.MAX_SAFE_INTEGER)
    );

    for (const { neighborId, edgeId } of neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push(neighborId);
      treeEdgeIds.add(edgeId);
    }
  }

  return treeEdgeIds;
}

export function Canvas({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onAddWord,
  onExpandWord,
  onOrganizeNetwork,
}: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<WordNodeType>(withRootFlag(initialNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState<WordEdge>(initialEdges);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    type: 'node' | 'pane';
    nodeId?: string;
    nodeWord?: string;
    isExpanded?: boolean;
  } | null>(null);

  const { screenToFlowPosition, getZoom, setCenter } = useReactFlow();

  const renderedEdges = useMemo(() => {
    const treeEdgeIds = getTreeEdgeIds(nodes, edges);
    return edges.map((edge) => {
      const isTreeEdge = treeEdgeIds.has(edge.id);
      const edgeData: WordEdgeData = edge.data || {};
      const rawPredicate =
        typeof edgeData.predicate === 'string'
          ? edgeData.predicate
          : typeof edgeData.label === 'string'
            ? edgeData.label
            : '';
      const rawPredicateReason = typeof edgeData.predicateReason === 'string' ? edgeData.predicateReason : '';
      const normalizedStyle = {
        ...(edge.style || {}),
        stroke: 'var(--edge-color)',
        strokeWidth: isTreeEdge ? 1.7 : 1.1,
        strokeOpacity: isTreeEdge ? 0.92 : 0.26,
        ...(isTreeEdge ? {} : { strokeDasharray: '7 6' }),
      };
      const predicate = rawPredicate.trim() || '关联';
      const predicateReason = rawPredicateReason.trim() || '该谓词用于表达新概念与旧概念之间的解释关系。';

      return {
        ...edge,
        type: 'predicateEdge',
        style: normalizedStyle,
        data: {
          ...(edge.data || {}),
          predicate,
          predicateReason,
          edgeRole: isTreeEdge ? 'tree' : 'cross',
        },
      };
    });
  }, [nodes, edges]);

  // 同步外部状态
  useEffect(() => {
    setNodes(withRootFlag(initialNodes));
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // 左键点击空白处 - 只有在画布为空时才能添加词语
  const handlePaneClick = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      setContextMenu(null);

      const clientX = 'nativeEvent' in event ? event.clientX : (event as MouseEvent).clientX;
      const clientY = 'nativeEvent' in event ? event.clientY : (event as MouseEvent).clientY;
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__node')) return;

      // 只有画布为空时才能通过点击添加词语
      if (initialNodes.length === 0) {
        const flowPosition = screenToFlowPosition({
          x: clientX,
          y: clientY,
        });
        setPopoverPosition(flowPosition);
      }
    },
    [initialNodes.length, screenToFlowPosition]
  );

  // 右键点击空白处 - 整理网络
  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();

      const clientX = 'nativeEvent' in event ? event.clientX : (event as MouseEvent).clientX;
      const clientY = 'nativeEvent' in event ? event.clientY : (event as MouseEvent).clientY;

      // 只有画布有内容时才显示整理菜单
      if (initialNodes.length > 0) {
        setContextMenu({
          position: { x: clientX, y: clientY },
          type: 'pane',
        });
      }
    },
    [initialNodes.length]
  );

  // 右键点击节点 - 展开方向控制
  const handleNodeContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent, node: Node) => {
      event.preventDefault();

      const nodeData = node.data as WordNodeType['data'];

      // 如果节点已展开，不显示菜单
      if (nodeData.isExpanded) return;

      const clientX = 'nativeEvent' in event ? event.clientX : (event as MouseEvent).clientX;
      const clientY = 'nativeEvent' in event ? event.clientY : (event as MouseEvent).clientY;

      setContextMenu({
        position: { x: clientX, y: clientY },
        type: 'node',
        nodeId: node.id,
        nodeWord: nodeData.word,
        isExpanded: nodeData.isExpanded,
      });
    },
    []
  );

  const handleAddWord = useCallback(
    (word: string) => {
      if (popoverPosition) {
        onAddWord(word, popoverPosition);
        setPopoverPosition(null);
      }
    },
    [popoverPosition, onAddWord]
  );

  const handleExpandWithDirection = useCallback(
    (direction: string) => {
      if (contextMenu?.nodeId) {
        onExpandWord(contextMenu.nodeId, direction);
      }
    },
    [contextMenu, onExpandWord]
  );

  const handleOrganizeNetwork = useCallback(() => {
    const focused = onOrganizeNetwork();
    if (!focused) return;

    // 节点位置更新后，将视角平滑拉回首节点
    requestAnimationFrame(() => {
      const width = 180;
      const height = 84;
      const centerX = focused.x + width / 2;
      const centerY = focused.y + height / 2;
      setCenter(centerX, centerY, {
        zoom: getZoom(),
        duration: 700,
      });
    });
  }, [onOrganizeNetwork, getZoom, setCenter]);

  // 左键点击节点 - 不做任何事（展开功能移到右键）
  const handleNodeClick = useCallback(
    () => {
      setContextMenu(null);
    },
    []
  );

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={renderedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={40}
          size={1}
          color="var(--grid-dot)"
          className={gridBackgroundClassName}
        />
        <Controls
          className="!bg-[var(--node-bg)] !border-[var(--node-border)] !shadow-md"
          showInteractive={false}
        />
      </ReactFlow>

      {popoverPosition && (
        <InputPopover
          position={popoverPosition}
          onSubmit={handleAddWord}
          onClose={() => setPopoverPosition(null)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          position={contextMenu.position}
          type={contextMenu.type}
          nodeWord={contextMenu.nodeWord}
          onClose={() => setContextMenu(null)}
          onExpandWithDirection={handleExpandWithDirection}
          onOrganizeNetwork={handleOrganizeNetwork}
        />
      )}
    </div>
  );
}
