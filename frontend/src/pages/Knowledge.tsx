import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Network, Search, Plus, RefreshCw, Link,
  Cpu, AlertCircle, Layers
} from 'lucide-react';
import { api } from '../api/client';
import type { KnowledgeGraph as KGType, KnowledgeNode } from '../types';
import { KnowledgeGraphView } from '../components/knowledge_graph/KnowledgeGraph';

const NODE_TYPES = [
  { value: 'concept', label: 'Concept', color: '#6b7280' },
  { value: 'project', label: 'Project', color: '#06b6d4' },
  { value: 'language', label: 'Language', color: '#10b981' },
  { value: 'framework', label: 'Framework', color: '#8b5cf6' },
  { value: 'tool', label: 'Tool', color: '#f59e0b' },
  { value: 'person', label: 'Person', color: '#ec4899' },
  { value: 'goal', label: 'Goal', color: '#f97316' },
  { value: 'skill', label: 'Skill', color: '#14b8a6' },
  { value: 'company', label: 'Company', color: '#ef4444' },
];

export const Knowledge: React.FC = () => {
  const [graph, setGraph] = useState<KGType>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [relationships, setRelationships] = useState<any>(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('concept');
  const [newDesc, setNewDesc] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const g = await api.getKnowledgeGraph();
      setGraph(g);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchGraph(); }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await api.searchKnowledge(searchQuery);
      setSearchResults(res.nodes || []);
    } catch (e) { console.error(e); }
  };

  const handleNodeClick = async (node: KnowledgeNode) => {
    setSelectedNode(node);
    try {
      const rel = await api.getNodeRelationships(node.id);
      setRelationships(rel);
    } catch (e) { console.error(e); }
  };

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setAddLoading(true);
    setError('');
    try {
      await api.addKnowledgeNode({ label: newLabel, node_type: newType, description: newDesc });
      setNewLabel(''); setNewDesc('');
      setShowAddNode(false);
      await fetchGraph();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add node');
    }
    setAddLoading(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-violet-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-violet-300 font-bold text-xl mb-1">
            <Network className="w-6 h-6 text-cyan-400" />
            Knowledge Graph
            <span className="text-[10px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full ml-1">P3</span>
          </div>
          <p className="text-xs text-slate-400">
            {graph.nodes.length} nodes · {graph.edges.length} edges — auto-built from your conversations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchGraph}
            className="px-3 py-2 glass-panel border border-white/10 text-slate-300 hover:text-white text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowAddNode(v => !v)}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs rounded-xl flex items-center gap-1.5 font-medium cursor-pointer hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" /> Add Node
          </button>
        </div>
      </div>

      {/* Add Node Form */}
      {showAddNode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-panel p-5 rounded-2xl border border-violet-500/20 overflow-hidden"
        >
          <h3 className="text-sm font-bold text-white mb-3">Add Knowledge Node</h3>
          {error && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </div>
          )}
          <form onSubmit={handleAddNode} className="flex flex-wrap gap-3">
            <input
              value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="Label (e.g. React, FastAPI, NOVA_X)"
              className="glass-input px-3 py-2 rounded-xl text-sm flex-1 min-w-32"
            />
            <select
              value={newType} onChange={e => setNewType(e.target.value)}
              className="glass-input px-2 py-2 rounded-xl text-sm bg-slate-900 text-slate-200"
            >
              {NODE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input
              value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="glass-input px-3 py-2 rounded-xl text-sm flex-1 min-w-48"
            />
            <button
              type="submit" disabled={addLoading || !newLabel.trim()}
              className="px-4 py-2 bg-violet-600 text-white text-sm rounded-xl disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {addLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </button>
          </form>
        </motion.div>
      )}

      {/* Main Graph + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Graph */}
        <div className="xl:col-span-3">
          {loading ? (
            <div className="h-[600px] glass-panel rounded-2xl border border-white/8 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : (
            <KnowledgeGraphView graph={graph} onNodeClick={handleNodeClick} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Search */}
          <div className="glass-panel p-4 rounded-2xl border border-white/8">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-300">Search Nodes</span>
            </div>
            <div className="flex gap-2">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="node name..."
                className="flex-1 glass-input px-2 py-1.5 rounded-lg text-xs"
              />
              <button
                onClick={handleSearch}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg cursor-pointer"
              >
                Go
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                {searchResults.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNodeClick(n)}
                    className="w-full text-left p-2 glass-panel rounded-lg border border-white/5 hover:border-indigo-500/30 transition-colors cursor-pointer"
                  >
                    <div className="text-xs text-white">{n.label}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{n.node_type}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Node Types legend */}
          <div className="glass-panel p-4 rounded-2xl border border-white/8">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">Node Types</span>
            </div>
            <div className="space-y-2">
              {NODE_TYPES.map(t => (
                <div key={t.value} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                    <span className="text-xs text-slate-300">{t.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {graph.nodes.filter(n => n.node_type === t.value).length}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Node Relationships */}
          {selectedNode && relationships && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-4 rounded-2xl border border-cyan-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Link className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">{selectedNode.label}</span>
                <span className="text-[10px] text-slate-400 capitalize">({selectedNode.node_type})</span>
              </div>
              {relationships.outgoing?.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] text-slate-400 mb-1">→ Connected to</div>
                  {relationships.outgoing.map((e: any, i: number) => (
                    <div key={i} className="text-xs text-slate-300 ml-2 mb-1">
                      <span className="text-indigo-400">{e.relationship}</span> → {e.target?.label}
                    </div>
                  ))}
                </div>
              )}
              {relationships.incoming?.length > 0 && (
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">← Connected from</div>
                  {relationships.incoming.map((e: any, i: number) => (
                    <div key={i} className="text-xs text-slate-300 ml-2 mb-1">
                      {e.source?.label} <span className="text-indigo-400">{e.relationship}</span> →
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
