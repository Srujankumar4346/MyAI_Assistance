import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Plus, Search, Download, Upload, Filter,
  Sparkles, AlertCircle, RefreshCw, Archive, X, Tag
} from 'lucide-react';
import { api } from '../api/client';
import type { EnhancedMemoryItem, MemoryStats as MemStats, TimelineGroup } from '../types';
import { MemoryCard } from '../components/memory/MemoryCard';
import { MemoryStatsBar } from '../components/memory/MemoryStats';
import { TimelineView } from '../components/memory/TimelineView';

const CATEGORIES = [
  'general', 'projects', 'programming', 'education', 'placement', 'skills',
  'friends', 'family', 'career', 'health', 'goals', 'tasks', 'ideas',
  'research', 'bookmarks', 'notes', 'coding_history', 'voice_history', 'preferences',
];

const MEMORY_TYPES = [
  'semantic', 'episodic', 'procedural', 'short_term', 'long_term',
  'working', 'conversation', 'project', 'preference', 'skill', 'document', 'coding',
];

type Tab = 'all' | 'timeline' | 'search' | 'documents';

export const Memory: React.FC = () => {
  const [tab, setTab] = useState<Tab>('all');
  const [memories, setMemories] = useState<EnhancedMemoryItem[]>([]);
  const [stats, setStats] = useState<MemStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineGroup[]>([]);
  const [searchResults, setSearchResults] = useState<EnhancedMemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState('');

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newType, setNewType] = useState('semantic');
  const [newTags, setNewTags] = useState('');
  const [newProject, setNewProject] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchType, setSearchType] = useState('');
  const [minImportance, setMinImportance] = useState(0);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [searching, setSearching] = useState(false);

  // Documents
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, timelineRes] = await Promise.all([
        api.getAllEnhancedMemories(200),
        api.getMemoryTimeline(),
      ]);
      setMemories(allRes.memories || []);
      setTimeline(timelineRes.timeline || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await api.getMemoryStatistics();
      setStats(s);
    } catch (e) { console.error(e); }
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    fetchStats();
  }, []);

  useEffect(() => {
    if (tab === 'documents') {
      api.listDocuments().then(d => setDocuments(d.documents || [])).catch(() => {});
    }
  }, [tab]);

  // ── Add Memory ──────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setAddLoading(true);
    setError('');
    try {
      const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
      await api.storeMemory({
        content: newContent,
        memory_type: newType,
        category: newCategory,
        tags,
        project_name: newProject || undefined,
      });
      setNewContent(''); setNewTags(''); setNewProject('');
      setShowAddForm(false);
      await fetchAll();
      await fetchStats();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save memory');
    }
    setAddLoading(false);
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handlePin = async (id: string) => {
    await api.pinMemory(id);
    setMemories(prev => prev.map(m => m.id === id ? { ...m, is_pinned: !m.is_pinned } : m));
  };
  const handleArchive = async (id: string) => {
    await api.archiveMemory(id);
    setMemories(prev => prev.filter(m => m.id !== id));
    await fetchStats();
  };
  const handleDelete = async (id: string) => {
    await api.deleteEnhancedMemory(id);
    setMemories(prev => prev.filter(m => m.id !== id));
    setSearchResults(prev => prev.filter(m => m.id !== id));
    await fetchStats();
  };
  const handleReinforce = async (id: string) => {
    await api.reinforceMemory(id);
    setMemories(prev => prev.map(m =>
      m.id === id ? { ...m, importance_score: Math.min(100, m.importance_score + 5), access_count: m.access_count + 1 } : m
    ));
  };

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    setSearching(true);
    try {
      const res = await api.searchMemories({
        q: searchQuery,
        category: searchCategory || undefined,
        memory_type: searchType || undefined,
        min_importance: minImportance,
        pinned_only: pinnedOnly,
        limit: 50,
      });
      setSearchResults(res.results || []);
    } catch (e) { console.error(e); }
    setSearching(false);
  };

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    const blob = await api.exportMemories();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'novax_memories.json'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import ──────────────────────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await api.importMemories(file);
    setTimeout(() => { fetchAll(); fetchStats(); }, 2000);
  };

  // ── Document Upload ─────────────────────────────────────────────────────────
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    await api.uploadDocument(file);
    setTimeout(() => api.listDocuments().then(d => setDocuments(d.documents || [])), 3000);
    setUploadingDoc(false);
  };

  const tabClass = (t: Tab) =>
    `px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
      tab === t
        ? 'bg-indigo-600/60 text-white border border-indigo-400/40'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
    }`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xl mb-1">
              <Brain className="w-6 h-6 text-cyan-400 animate-pulse" />
              Neural Memory Engine
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full ml-1">
                PHASE 3
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Semantic memory with importance scoring, decay, reinforcement, and knowledge graph integration.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-2 text-xs glass-panel border border-white/10 text-slate-300 hover:text-white rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <label className="px-3 py-2 text-xs glass-panel border border-white/10 text-slate-300 hover:text-white rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" /> Import
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="px-4 py-2 text-xs bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl flex items-center gap-1.5 font-medium cursor-pointer hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" /> New Memory
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <MemoryStatsBar stats={stats} loading={statsLoading} />

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-panel p-6 rounded-2xl border border-cyan-500/20 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Store New Memory
              </h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-3">
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="What should NOVA_X remember? e.g. 'I prefer TypeScript with Tailwind CSS for frontend projects'"
                rows={3}
                className="w-full glass-input px-4 py-3 rounded-xl text-sm resize-none"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full glass-input px-2 py-2 rounded-xl text-xs bg-slate-900 text-slate-200"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">Memory Type</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="w-full glass-input px-2 py-2 rounded-xl text-xs bg-slate-900 text-slate-200"
                  >
                    {MEMORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">Tags (comma separated)</label>
                  <input
                    value={newTags}
                    onChange={e => setNewTags(e.target.value)}
                    placeholder="react, typescript"
                    className="w-full glass-input px-2 py-2 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">Project</label>
                  <input
                    value={newProject}
                    onChange={e => setNewProject(e.target.value)}
                    placeholder="NOVA_X"
                    className="w-full glass-input px-2 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addLoading || !newContent.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-sm rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {addLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Store Memory
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button className={tabClass('all')} onClick={() => setTab('all')}>All Memories</button>
        <button className={tabClass('timeline')} onClick={() => { setTab('timeline'); }}>Timeline</button>
        <button className={tabClass('search')} onClick={() => setTab('search')}>Advanced Search</button>
        <button className={tabClass('documents')} onClick={() => setTab('documents')}>Documents</button>
      </div>

      {/* All Memories Tab */}
      {tab === 'all' && (
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-panel rounded-2xl border border-white/8 p-4 h-40 animate-pulse bg-slate-800/40" />
              ))}
            </div>
          ) : memories.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No memories yet. Add your first memory above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {memories.map(m => (
                  <MemoryCard
                    key={m.id} memory={m}
                    onPin={handlePin} onArchive={handleArchive}
                    onDelete={handleDelete} onReinforce={handleReinforce}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {tab === 'timeline' && (
        <TimelineView
          timeline={timeline}
          onPin={handlePin} onArchive={handleArchive}
          onDelete={handleDelete} onReinforce={handleReinforce}
        />
      )}

      {/* Advanced Search Tab */}
      {tab === 'search' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-400" /> Search & Filter
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] text-slate-400 mb-1 block">Semantic Query</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by meaning..."
                    className="w-full pl-9 glass-input px-3 py-2 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Category</label>
                <select
                  value={searchCategory}
                  onChange={e => setSearchCategory(e.target.value)}
                  className="w-full glass-input px-2 py-2 rounded-xl text-xs bg-slate-900 text-slate-200"
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Memory Type</label>
                <select
                  value={searchType}
                  onChange={e => setSearchType(e.target.value)}
                  className="w-full glass-input px-2 py-2 rounded-xl text-xs bg-slate-900 text-slate-200"
                >
                  <option value="">All types</option>
                  {MEMORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Min Importance: {minImportance}</label>
                <input
                  type="range" min="0" max="100" step="5"
                  value={minImportance}
                  onChange={e => setMinImportance(Number(e.target.value))}
                  className="w-32 accent-indigo-500"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox" checked={pinnedOnly}
                  onChange={e => setPinnedOnly(e.target.checked)}
                  className="accent-indigo-500 w-4 h-4"
                />
                Pinned only
              </label>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-xl flex items-center gap-2 cursor-pointer hover:bg-indigo-500 disabled:opacity-50 ml-auto"
              >
                {searching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Search
              </button>
            </div>
          </div>
          {searchResults.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 mb-3">{searchResults.length} results</div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {searchResults.map(m => (
                  <MemoryCard key={m.id} memory={m}
                    onPin={handlePin} onArchive={handleArchive}
                    onDelete={handleDelete} onReinforce={handleReinforce}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Document Intelligence</h3>
              <label className={`px-4 py-2 text-xs rounded-xl flex items-center gap-2 cursor-pointer font-medium transition-all ${uploadingDoc ? 'bg-slate-700 text-slate-400' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90'}`}>
                <Upload className="w-3.5 h-3.5" />
                {uploadingDoc ? 'Processing...' : 'Upload Document'}
                <input type="file" accept=".pdf,.docx,.pptx,.xlsx,.txt" className="hidden" onChange={handleDocUpload} disabled={uploadingDoc} />
              </label>
            </div>
            <p className="text-xs text-slate-400 mb-4">Upload PDF, DOCX, PPTX, XLSX, or TXT files. NOVA_X will extract key facts and store them as memories.</p>
            {documents.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">No documents uploaded yet</div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 glass-panel rounded-xl border border-white/5">
                    <div>
                      <div className="text-sm text-white">{doc.filename}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {doc.file_type.toUpperCase()} · {doc.page_count} pages · {doc.memories_extracted} memories extracted
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-mono ${
                      doc.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' :
                      doc.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400 animate-pulse'
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
