import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Battery, Monitor, Thermometer, ShieldAlert } from 'lucide-react';
import apiClient from '../api/client';

export default function SystemMonitor() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiClient.post('/desktop/execute', {
          action_type: 'system',
          target: 'status',
          level: 'SAFE'
        });
        setMetrics(res.result);
      } catch (err) {
        console.error("Failed to fetch system metrics", err);
      }
    };
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-8 h-8 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white tracking-wide">System Monitor</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* CPU */}
        <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/50 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span className="text-slate-300 font-semibold">CPU Usage</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {metrics?.cpu_percent !== undefined ? `${metrics.cpu_percent}%` : '--'}
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-auto">
            <div 
              className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${metrics?.cpu_percent || 0}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/50 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Monitor className="w-5 h-5 text-fuchsia-400" />
            <span className="text-slate-300 font-semibold">RAM Usage</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {metrics?.ram_percent !== undefined ? `${metrics.ram_percent}%` : '--'}
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-auto">
            <div 
              className="bg-fuchsia-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${metrics?.ram_percent || 0}%` }}
            />
          </div>
        </div>

        {/* Disk */}
        <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/50 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <span className="text-slate-300 font-semibold">Disk Usage</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {metrics?.disk_percent !== undefined ? `${metrics.disk_percent}%` : '--'}
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-auto">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${metrics?.disk_percent || 0}%` }}
            />
          </div>
        </div>
        
        {/* Battery */}
        <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/50 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Battery className="w-5 h-5 text-yellow-400" />
            <span className="text-slate-300 font-semibold">Battery</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {metrics?.battery_percent !== undefined && metrics?.battery_percent !== null ? `${metrics.battery_percent}%` : 'N/A'}
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-auto">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${metrics?.battery_percent || 0}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Temperature Alert */}
      {metrics?.temperature !== undefined && metrics?.temperature !== null && (
        <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Thermometer className="w-6 h-6 text-orange-400" />
            <div>
              <h3 className="text-white font-semibold">Core Temperature</h3>
              <p className="text-slate-400 text-sm">System Thermal Monitor</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-400">{metrics.temperature}°C</div>
        </div>
      )}
      
      {!metrics && (
        <div className="text-slate-400 text-center py-12 flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          Loading system telemetry...
        </div>
      )}
    </div>
  );
}
