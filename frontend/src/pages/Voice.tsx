import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoice } from '../hooks/useVoice';
import { MicrophoneOrb } from '../components/voice/MicrophoneOrb';
import { VoiceWaveform } from '../components/voice/VoiceWaveform';
import { VoiceTranscript } from '../components/voice/VoiceTranscript';
import { VoiceControls } from '../components/voice/VoiceControls';
import { api } from '../api/client';

interface VoicePageProps {
  selectedModel: string;
}

// ─── Particle Background ──────────────────────────────────────────────────────
const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: Array<{ x: number; y: number; r: number; dx: number; dy: number; alpha: number }> = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-50" />;
};

// ─── Voice Settings Panel ─────────────────────────────────────────────────────
interface VoiceSettingsPanelProps {
  onClose: () => void;
}
const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({ onClose }) => {
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([]);
  const [settings, setSettings] = useState({
    voice_name: 'en-US-AriaNeural',
    language: 'en-US',
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
    continuous_mode: false,
    noise_reduction: true,
    auto_detect_silence: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getVoiceSettings().then((s: typeof settings) => setSettings(s)).catch(() => {});
    api.getVoices().then((r: { voices: { id: string; name: string }[] }) => setVoices(r.voices)).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try { await api.updateVoiceSettings(settings); } catch {}
    setSaving(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="absolute right-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-l border-indigo-500/20 z-30 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h3 className="font-semibold text-white">Voice Settings</h3>
        <button id="voice-settings-close" onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Voice */}
        <div>
          <label className="text-xs font-mono text-slate-400 mb-1 block">AI Voice</label>
          <select
            id="voice-select"
            value={settings.voice_name}
            onChange={e => setSettings(s => ({ ...s, voice_name: e.target.value }))}
            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="text-xs font-mono text-slate-400 mb-1 block">Language</label>
          <select
            id="voice-language"
            value={settings.language}
            onChange={e => setSettings(s => ({ ...s, language: e.target.value }))}
            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="en-AU">English (AU)</option>
            <option value="en-IN">English (IN)</option>
          </select>
        </div>

        {/* Speed */}
        <div>
          <label className="text-xs font-mono text-slate-400 mb-1 flex justify-between">
            <span>Speed</span><span className="text-indigo-300">{settings.speed.toFixed(1)}x</span>
          </label>
          <input type="range" min="0.5" max="2" step="0.1"
            value={settings.speed}
            onChange={e => setSettings(s => ({ ...s, speed: parseFloat(e.target.value) }))}
            className="w-full accent-indigo-500"
          />
        </div>

        {/* Pitch */}
        <div>
          <label className="text-xs font-mono text-slate-400 mb-1 flex justify-between">
            <span>Pitch</span><span className="text-indigo-300">{settings.pitch.toFixed(1)}x</span>
          </label>
          <input type="range" min="0.5" max="2" step="0.1"
            value={settings.pitch}
            onChange={e => setSettings(s => ({ ...s, pitch: parseFloat(e.target.value) }))}
            className="w-full accent-indigo-500"
          />
        </div>

        {/* Volume */}
        <div>
          <label className="text-xs font-mono text-slate-400 mb-1 flex justify-between">
            <span>Volume</span><span className="text-indigo-300">{Math.round(settings.volume * 100)}%</span>
          </label>
          <input type="range" min="0" max="1" step="0.05"
            value={settings.volume}
            onChange={e => setSettings(s => ({ ...s, volume: parseFloat(e.target.value) }))}
            className="w-full accent-indigo-500"
          />
        </div>

        {/* Toggles */}
        {[
          { key: 'continuous_mode', label: 'Continuous Listening' },
          { key: 'noise_reduction', label: 'Noise Reduction' },
          { key: 'auto_detect_silence', label: 'Auto Detect Silence' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300">{label}</span>
            <div
              className={`relative w-10 h-5 rounded-full transition-colors ${(settings as Record<string, unknown>)[key] ? 'bg-indigo-600' : 'bg-slate-700'}`}
              onClick={() => setSettings(s => ({ ...s, [key]: !(s as Record<string, unknown>)[key] }))}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${(settings as Record<string, unknown>)[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </label>
        ))}
      </div>

      <div className="p-4 border-t border-white/5">
        <button
          id="voice-settings-save"
          onClick={save}
          disabled={saving}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </motion.div>
  );
};

// ─── Main Voice Page ──────────────────────────────────────────────────────────
export const Voice: React.FC<VoicePageProps> = ({ selectedModel }) => {
  const [showSettings, setShowSettings] = useState(false);

  const {
    voiceState, transcript, liveText, aiText,
    confidence, latency, error, isConnected,
    startListening, stopListening, stopSpeaking,
    toggleContinuous, clearTranscript, isContinuous,
  } = useVoice({ model: selectedModel });

  const stateLabels: Record<string, string> = {
    idle: 'STANDBY', listening: 'LISTENING', thinking: 'PROCESSING', speaking: 'RESPONDING', error: 'ERROR',
  };

  const handleOrbClick = () => {
    if (voiceState === 'listening') stopListening();
    else if (voiceState === 'idle' || voiceState === 'error') startListening();
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-slate-950 flex flex-col">
      {/* Particle Background */}
      <ParticleCanvas />

      {/* Ambient gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/8 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wider">
            SAI Voice Assistant
          </h2>
          <p className="text-xs font-mono text-indigo-400/70">
            JARVIS-Style Real-Time AI
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* State badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
            voiceState === 'listening' ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10' :
            voiceState === 'thinking'  ? 'border-amber-400/40  text-amber-300  bg-amber-400/10'  :
            voiceState === 'speaking'  ? 'border-blue-400/40   text-blue-300   bg-blue-400/10'   :
            voiceState === 'error'     ? 'border-red-400/40    text-red-300    bg-red-400/10'    :
            'border-slate-600/40 text-slate-400 bg-slate-800/30'
          }`}>
            ● {stateLabels[voiceState] || 'STANDBY'}
          </div>
          {/* Settings */}
          <button
            id="voice-settings-open"
            onClick={() => setShowSettings(s => !s)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/60 border border-white/10 text-slate-400 hover:text-white hover:border-indigo-400/40 transition-all"
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Left — Orb + waveform + controls */}
        <div className="flex flex-col items-center justify-between w-80 shrink-0 px-6 py-8 border-r border-white/5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 w-full text-center">
            {[
              { label: 'Model', value: selectedModel || 'gemma', color: 'text-indigo-300' },
              { label: 'Status', value: isConnected ? 'Online' : 'Offline', color: isConnected ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Confidence', value: `${confidence}%`, color: 'text-amber-300' },
              { label: 'Latency', value: latency ? `${latency}ms` : '—', color: 'text-cyan-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800/40 border border-white/5 rounded-xl p-2.5">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</p>
                <p className={`text-sm font-bold font-mono ${color} truncate`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Orb */}
          <div className="flex flex-col items-center gap-8">
            <MicrophoneOrb
              state={voiceState}
              onClick={handleOrbClick}
              disabled={voiceState === 'thinking' || voiceState === 'speaking'}
            />
            <VoiceWaveform state={voiceState} />
          </div>

          {/* Controls */}
          <VoiceControls
            state={voiceState}
            isContinuous={isContinuous}
            isConnected={isConnected}
            onPushToTalk={startListening}
            onStop={stopListening}
            onToggleContinuous={toggleContinuous}
            onStopSpeaking={stopSpeaking}
          />
        </div>

        {/* Right — Transcript */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <VoiceTranscript
            entries={transcript}
            liveText={liveText}
            aiText={aiText}
            onClear={clearTranscript}
          />
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-red-500/20 border border-red-400/40 rounded-xl text-red-300 text-sm font-mono backdrop-blur-sm"
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && <VoiceSettingsPanel onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </div>
  );
};
