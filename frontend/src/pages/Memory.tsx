import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { MemoryItem } from '../types';
import { Brain, Plus, Trash2, Tag, Search, Sparkles, AlertCircle } from 'lucide-react';

export const Memory: React.FC = () => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [newContent, setNewContent] = useState('');
  const [category, setCategory] = useState('user_profile');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const data = await api.getMemories();
      setMemories(data);
    } catch (err: any) {
      console.error('Failed to fetch memories', err);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setLoading(true);
    setError('');

    try {
      await api.addMemory({ content: newContent, category });
      setNewContent('');
      fetchMemories();
    } catch (err: any) {
      setError(err.message || 'Failed to save memory');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMemory(id);
      fetchMemories();
    } catch (err) {
      console.error('Failed to delete memory', err);
    }
  };

  const filteredMemories = memories.filter((m) =>
    m.content.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-lg mb-1">
            <Brain className="w-6 h-6 text-cyan-400" /> Vector Memory Storage
          </div>
          <p className="text-xs text-slate-300">
            Long-term persistent semantic memory powered by ChromaDB. Stored facts are automatically retrieved during chat sessions.
          </p>
        </div>
        <div className="bg-indigo-600/20 px-4 py-2 rounded-xl border border-indigo-500/30 text-cyan-300 font-mono text-xs">
          {memories.length} Stored Memories
        </div>
      </div>

      {/* Add Memory Form */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" /> Store New Fact into SAI Memory
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <form onSubmit={handleAddMemory} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="e.g. User preference: Prefers TypeScript, building SAI OS in Python & React"
            className="flex-1 glass-input px-4 py-3 rounded-xl text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="glass-input px-3 py-3 rounded-xl text-sm bg-slate-900 text-slate-200"
          >
            <option value="user_profile">User Profile</option>
            <option value="skills">Skills & Stack</option>
            <option value="projects">Projects</option>
            <option value="preferences">Preferences</option>
            <option value="general">General Note</option>
          </select>
          <button
            type="submit"
            disabled={loading || !newContent.trim()}
            className="glow-button px-5 py-3 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add Memory
          </button>
        </form>
      </div>

      {/* Memory Search & List */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-white">Retrieved Memory Records</h3>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories..."
              className="w-full pl-9 pr-3 py-2 glass-input rounded-xl text-xs"
            />
          </div>
        </div>

        {filteredMemories.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No long-term memories found. Add key details above for SAI to remember.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="glass-panel glass-panel-hover p-4 rounded-xl border border-white/5 flex items-start justify-between gap-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30 capitalize flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {mem.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{mem.content}</p>
                </div>
                <button
                  onClick={() => handleDelete(mem.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-400 transition-opacity"
                  title="Delete memory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
