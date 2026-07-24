import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { KnowledgeGraph, KnowledgeNode } from '../../types';
import { Search, ZoomIn, Info } from 'lucide-react';

interface KnowledgeGraphProps {
  graph: KnowledgeGraph;
  onNodeClick?: (node: KnowledgeNode) => void;
}

// Layout helper — simple force-directed positioning
function layoutNodes(rawNodes: KnowledgeNode[]): Node[] {
  const centerX = 400;
  const centerY = 300;
  const radius = Math.max(150, rawNodes.length * 25);

  return rawNodes.map((n, i) => {
    const angle = (i / rawNodes.length) * 2 * Math.PI;
    return {
      id: n.id,
      data: { label: n.label, node_type: n.node_type, importance: n.importance, color: n.color },
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
      style: {
        background: n.color + '22',
        border: `2px solid ${n.color}88`,
        borderRadius: '12px',
        color: '#e2e8f0',
        fontSize: 12,
        fontWeight: 600,
        padding: '8px 14px',
        minWidth: 80,
        textAlign: 'center' as const,
        boxShadow: `0 0 12px ${n.color}44`,
      },
      type: 'default',
    };
  });
}

const NODE_TYPE_COLORS: Record<string, string> = {
  user: '#6366f1',
  project: '#06b6d4',
  language: '#10b981',
  framework: '#8b5cf6',
  tool: '#f59e0b',
  person: '#ec4899',
  goal: '#f97316',
  skill: '#14b8a6',
  concept: '#6b7280',
  company: '#ef4444',
};

export const KnowledgeGraphView: React.FC<KnowledgeGraphProps> = ({ graph, onNodeClick }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const rfNodes = layoutNodes(graph.nodes);
    const rfEdges: Edge[] = graph.edges.map((e) => ({
      id: `edge-${e.id}`,
      source: e.source,
      target: e.target,
      label: e.relationship,
      style: { stroke: '#475569', strokeWidth: 1.5 },
      labelStyle: { fill: '#94a3b8', fontSize: 9, fontWeight: 500 },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
      animated: e.weight > 2,
    }));
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [graph]);

  // Filter nodes by search
  useEffect(() => {
    if (!searchQuery) {
      setNodes(layoutNodes(graph.nodes));
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = graph.nodes.filter(
      (n) => n.label.toLowerCase().includes(q) || n.node_type.toLowerCase().includes(q)
    );
    setNodes(layoutNodes(filtered));
  }, [searchQuery, graph.nodes]);

  const handleNodeClick = useCallback(
    (_: any, node: Node) => {
      setSelectedNode(node.data);
      const gNode = graph.nodes.find((n) => n.id === node.id);
      if (gNode && onNodeClick) onNodeClick(gNode);
    },
    [graph.nodes, onNodeClick]
  );

  if (graph.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-slate-500 gap-3">
        <div className="text-4xl">🕸️</div>
        <p className="text-sm">
          Knowledge graph is empty. Chat with NOVA_X to build it automatically.
        </p>
      </div>
    );
  }

  // Legend
  const typesPresent = [...new Set(graph.nodes.map((n) => n.node_type))];

  return (
    <div className="relative h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-slate-950/80">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="!bg-transparent"
        defaultEdgeOptions={{ animated: false }}
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls
          className="!bg-slate-900/80 !border-white/10 !rounded-xl"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(n) => (n.data?.color as string) || '#6366f1'}
          className="!bg-slate-900/80 !border-white/10 !rounded-xl"
          maskColor="rgba(0,0,0,0.7)"
        />

        {/* Search panel */}
        <Panel position="top-left">
          <div className="glass-panel rounded-xl border border-white/10 p-2 flex items-center gap-2 backdrop-blur-md">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter nodes..."
              className="bg-transparent text-xs text-slate-200 outline-none w-32 placeholder:text-slate-500"
            />
          </div>
        </Panel>

        {/* Legend */}
        <Panel position="bottom-left">
          <div className="glass-panel rounded-xl border border-white/10 p-3 flex flex-wrap gap-2 max-w-xs backdrop-blur-md">
            {typesPresent.map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: NODE_TYPE_COLORS[t] || '#6b7280' }}
                />
                <span className="text-[10px] text-slate-400 capitalize">{t}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Selected node info */}
        {selectedNode && (
          <Panel position="top-right">
            <div className="glass-panel rounded-xl border border-white/10 p-3 max-w-52 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-bold text-white">{selectedNode.label}</span>
              </div>
              <div className="text-[10px] text-slate-400 space-y-1">
                <div>
                  Type: <span className="text-slate-300 capitalize">{selectedNode.node_type}</span>
                </div>
                <div>
                  Importance:{' '}
                  <span className="text-amber-400">{Math.round(selectedNode.importance)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="mt-2 text-[10px] text-slate-500 hover:text-slate-300"
              >
                Dismiss
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};
