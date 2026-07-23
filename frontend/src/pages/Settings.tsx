import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { AppSettings } from '../types';
import { Settings as SettingsIcon, Save, Cpu, Sliders, CheckCircle2 } from 'lucide-react';

interface SettingsProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export const SettingsPage: React.FC<SettingsProps> = ({ selectedModel, setSelectedModel }) => {
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    selected_model: selectedModel || 'gemma',
    memory_enabled: true,
    streaming_enabled: true,
    animation_enabled: true,
    auto_save_conversations: true,
  });
  const [availableModels, setAvailableModels] = useState<string[]>(['gemma', 'llama3', 'qwen', 'mistral']);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchModels();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      if (data.selected_model) setSelectedModel(data.selected_model);
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const fetchModels = async () => {
    try {
      const data = await api.getModels();
      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models);
        setSettings(prev => {
          if (!data.models.includes(prev.selected_model)) {
            return { ...prev, selected_model: data.models[0] };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to fetch models', err);
    }
  };

  const handleSave = async () => {
    try {
      await api.updateSettings(settings);
      setSelectedModel(settings.selected_model);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save settings', err);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-8">
      <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-indigo-400" /> NOVA_X Configuration & Preferences
          </h2>
          <p className="text-xs text-slate-300 mt-1">Customize AI model engines, memory behavior, and UI features.</p>
        </div>
        <button
          onClick={handleSave}
          className="glow-button px-5 py-2.5 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
        >
          {saved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {saved ? 'Settings Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
          <Cpu className="w-4 h-4 text-cyan-400" /> AI Model & Engine
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Default Inference Model</label>
            <select
              value={settings.selected_model}
              onChange={(e) => setSettings({ ...settings, selected_model: e.target.value })}
              className="w-full glass-input px-4 py-3 rounded-xl text-sm bg-slate-900 text-slate-100 capitalize"
            >
              {availableModels.map((m) => (
                <option key={m} value={m} className="capitalize">
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">UI Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
              className="w-full glass-input px-4 py-3 rounded-xl text-sm bg-slate-900 text-slate-100"
            >
              <option value="dark">Futuristic Cyber Dark (Default)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
          <Sliders className="w-4 h-4 text-indigo-400" /> System Features & Switches
        </h3>

        <div className="space-y-4">
          {[
            { key: 'memory_enabled', label: 'Long-term Vector Memory Retrieval', desc: 'Query ChromaDB context during conversation generation' },
            { key: 'streaming_enabled', label: 'Token Response Streaming', desc: 'Stream AI output chunk by chunk in real time' },
            { key: 'animation_enabled', label: 'Glassmorphism & Micro-animations', desc: 'Enable glow buttons, pulse metrics, and smooth transitions' },
            { key: 'auto_save_conversations', label: 'Auto-save Chat Sessions', desc: 'Persist chat history to SQLite database automatically' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 glass-panel rounded-xl border border-white/5">
              <div>
                <span className="text-sm font-semibold text-slate-200 block">{label}</span>
                <span className="text-xs text-slate-400">{desc}</span>
              </div>
              <input
                type="checkbox"
                checked={(settings as any)[key]}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
