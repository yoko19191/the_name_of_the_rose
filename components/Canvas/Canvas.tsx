'use client';

import { useCallback, useState, useEffect } from 'react';
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
  type DefaultEdgeOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { WordNode } from './WordNode';
import { InputPopover } from './InputPopover';
import { ContextMenu } from './ContextMenu';
import type { WordNode as WordNodeType, WordEdge } from '@/types';

interface CanvasProps {
  nodes: WordNodeType[];
  edges: WordEdge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onAddWord: (word: string, position: { x: number; y: number }) => void;
  onExpandWord: (nodeId: string, direction?: string) => void;
  onOrganizeNetwork: () => void;
}

const nodeTypes: NodeTypes = {
  wordNode: WordNode,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'straight',
  style: { stroke: 'var(--edge-color)', strokeWidth: 1.5 },
  animated: false,
};

// 网格背景样式
const gridBackgroundClassName = 'grid-background';

export function Canvas({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onAddWord,
  onExpandWord,
  onOrganizeNetwork,
}: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    type: 'node' | 'pane';
    nodeId?: string;
    nodeWord?: string;
    isExpanded?: boolean;
  } | null>(null);

  const { screenToFlowPosition } = useReactFlow();

  // 同步外部状态
  useEffect(() => {
    setNodes(initialNodes);
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
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        nodeTypes={nodeTypes}
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
          onOrganizeNetwork={onOrganizeNetwork}
        />
      )}
    </div>
  );
}
