import React, { useState, useEffect } from 'react';
import { BrowserWebSocketProvider } from '../contexts/BrowserWebSocketProvider';
import { BrowserStatusWidget } from '../components/BrowserStatusWidget';
import { SessionPanelWidget } from '../components/SessionPanelWidget';
import { TabManagerWidget } from '../components/TabManagerWidget';
import { DownloadsMonitorWidget } from '../components/DownloadsMonitorWidget';
import { ResearchMonitorWidget } from '../components/ResearchMonitorWidget';
import { AutomationQueueWidget } from '../components/AutomationQueueWidget';
import { BrowserHealthWidget } from '../components/BrowserHealthWidget';
import { MemoryKnowledgeWidget } from '../components/MemoryKnowledgeWidget';
import { ActivityTimelineWidget } from '../components/ActivityTimelineWidget';
import {
  Search,
  Monitor,
  Bot,
  BrainCircuit,
  Activity,
  Globe,
  RefreshCcw,
  LayoutGrid,
} from 'lucide-react';

export const BrowserDashboard: React.FC = () => {
  const [workspace, setWorkspace] = useState('Development');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Global Status State
  const [globalStatus] = useState({
    aiModel: 'ollama/llama-3',
    voice: 'connected',
    desktop: 'connected',
    memory: 'connected',
    user: 'system_user',
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // In a real implementation, this would re-fetch the REST snapshots for all widgets
    await new Promise((r) => setTimeout(r, 1000));
    setIsRefreshing(false);
  };

  return (
    <BrowserWebSocketProvider>
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-indigo-500/30">
        {/* GLOBAL STATUS BAR */}
        <div className="h-8 bg-black border-b border-gray-800 flex items-center justify-between px-4 text-[10px] uppercase font-bold tracking-wider text-gray-400">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <BrainCircuit className="w-3 h-3 text-pink-400" /> {globalStatus.aiModel}
            </span>
            <span className="flex items-center gap-1.5">
              <Monitor className="w-3 h-3 text-blue-400" /> Desktop: {globalStatus.desktop}
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-emerald-400" /> Browser: active
            </span>
            <span className="flex items-center gap-1.5">
              <Bot className="w-3 h-3 text-orange-400" /> Voice: {globalStatus.voice}
            </span>
            <span className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-purple-400" /> Memory: {globalStatus.memory}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>User: {globalStatus.user}</span>
            <span>
              WS: <span className="text-emerald-400">Connected</span>
            </span>
          </div>
        </div>

        {/* DASHBOARD HEADER */}
        <header className="h-16 bg-gray-900/50 backdrop-blur-xl border-b border-gray-800 px-6 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
              <LayoutGrid className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-100 tracking-tight leading-tight">
                NOVA_X Mission Control
              </h1>
              <p className="text-xs text-indigo-400 font-medium">Browser Engine v0.5.1</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Global Search */}
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder="Global Search (Tabs, Events, Memory)..."
                className="bg-gray-900 border border-gray-700 text-sm rounded-full pl-9 pr-4 py-1.5 w-64 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Workspace Selector */}
            <select
              className="bg-gray-900 border border-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-gray-200"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
            >
              <option value="Development">Workspace: Development</option>
              <option value="Research">Workspace: Research</option>
              <option value="Personal">Workspace: Personal</option>
            </select>

            <button
              onClick={handleRefresh}
              className={`p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh REST Snapshots"
            >
              <RefreshCcw className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </header>

        {/* WIDGET GRID */}
        <main className="flex-1 p-6 overflow-x-hidden">
          <div className="grid grid-cols-12 gap-6 max-w-[1920px] mx-auto">
            {/* TOP ROW */}
            <div className="col-span-12 lg:col-span-4 h-[300px]">
              <BrowserStatusWidget />
            </div>
            <div className="col-span-12 lg:col-span-8 h-[300px]">
              <SessionPanelWidget />
            </div>

            {/* MIDDLE ROW */}
            <div className="col-span-12 lg:col-span-3 h-[400px]">
              <TabManagerWidget />
            </div>
            <div className="col-span-12 lg:col-span-3 h-[400px]">
              <DownloadsMonitorWidget />
            </div>
            <div className="col-span-12 lg:col-span-3 h-[400px]">
              <ResearchMonitorWidget />
            </div>
            <div className="col-span-12 lg:col-span-3 h-[400px]">
              <AutomationQueueWidget />
            </div>

            {/* BOTTOM ROW */}
            <div className="col-span-12 xl:col-span-4 h-[400px]">
              <BrowserHealthWidget />
            </div>
            <div className="col-span-12 xl:col-span-4 h-[400px]">
              <MemoryKnowledgeWidget />
            </div>
            <div className="col-span-12 xl:col-span-4 h-[400px]">
              <ActivityTimelineWidget />
            </div>
          </div>
        </main>
      </div>
    </BrowserWebSocketProvider>
  );
};
