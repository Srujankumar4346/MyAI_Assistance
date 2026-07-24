import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, Code, Globe, Star, RefreshCw, Save,
  TrendingUp, Zap, BookOpen, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../api/client';
import type { LearningProfile } from '../types';

const LANGUAGES = ['Python', 'TypeScript', 'JavaScript', 'Java', 'C++', 'Go', 'Rust', 'Swift', 'Kotlin'];
const FRAMEWORKS = ['React', 'FastAPI', 'Next.js', 'Django', 'Vue', 'Angular', 'Tailwind', 'PyTorch'];
const STYLES = ['concise', 'detailed', 'technical', 'casual'];

function ProfileField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options?: string[];
}) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 mb-1 block font-mono uppercase tracking-wider">{label}</label>
      {options ? (
        <select
          value={value} onChange={e => onChange(e.target.value)}
          className="w-full glass-input px-3 py-2 rounded-xl text-sm bg-slate-900 text-slate-200"
        >
          <option value="">-- not set --</option>
          {options.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
        </select>
      ) : (
        <input
          value={value} onChange={e => onChange(e.target.value)}
          className="w-full glass-input px-3 py-2 rounded-xl text-sm"
        />
      )}
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-xs text-slate-500">Not detected yet</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span key={item} className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 capitalize">
          {item}
        </span>
      ))}
    </div>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const progress = (score / 100) * c;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#6366f1' : '#475569';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg width="96" height="96" className="-rotate-90">
          <circle cx="48" cy="48" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={c} strokeDashoffset={c - progress}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{Math.round(score)}</span>
          <span className="text-[9px] text-slate-400">/ 100</span>
        </div>
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

export const Learning: React.FC = () => {
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  // Edit form state
  const [primaryLang, setPrimaryLang] = useState('');
  const [secondaryLangs, setSecondaryLangs] = useState('');
  const [frameworks, setFrameworks] = useState('');
  const [aiModels, setAiModels] = useState('');
  const [codingStyle, setCodingStyle] = useState('');
  const [replyStyle, setReplyStyle] = useState('');
  const [writingStyle, setWritingStyle] = useState('');
  const [dailyRoutine, setDailyRoutine] = useState('');
  const [workHabits, setWorkHabits] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([api.getLearningProfile(), api.getLearningStatistics()]);
      setProfile(p);
      setStats(s);
      // Populate edit form
      setPrimaryLang(p.primary_language || '');
      setSecondaryLangs((p.secondary_languages || []).join(', '));
      setFrameworks((p.preferred_frameworks || []).join(', '));
      setAiModels((p.preferred_ai_models || []).join(', '));
      setCodingStyle(p.coding_style || '');
      setReplyStyle(p.reply_style || '');
      setWritingStyle(p.writing_style || '');
      setDailyRoutine(p.daily_routine || '');
      setWorkHabits(p.work_habits || '');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateLearningProfile({
        primary_language: primaryLang || undefined,
        secondary_languages: secondaryLangs || undefined,
        preferred_frameworks: frameworks || undefined,
        preferred_ai_models: aiModels || undefined,
        coding_style: codingStyle || undefined,
        reply_style: replyStyle || undefined,
        writing_style: writingStyle || undefined,
        daily_routine: dailyRoutine || undefined,
        work_habits: workHabits || undefined,
      });
      setEditMode(false);
      await fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-xl mb-1">
            <GraduationCap className="w-6 h-6 text-cyan-400" />
            Learning & Personality Engine
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full ml-1">P3</span>
          </div>
          <p className="text-xs text-slate-400">
            NOVA_X continuously learns your style, preferences, and habits from every conversation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="px-3 py-2 glass-panel border border-white/10 text-slate-300 hover:text-white text-xs rounded-xl flex items-center gap-1.5 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => editMode ? handleSave() : setEditMode(true)}
            disabled={saving}
            className={`px-4 py-2 text-xs rounded-xl flex items-center gap-1.5 font-medium cursor-pointer transition-all ${
              editMode
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90'
                : 'glass-panel border border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : editMode ? <Save className="w-3.5 h-3.5" /> : null}
            {editMode ? (saving ? 'Saving...' : 'Save Profile') : 'Edit Profile'}
          </button>
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl border border-white/8 p-6 flex flex-col items-center gap-3">
          <ScoreRing score={profile?.learning_score || 0} label="Learning Score" />
          <div className="text-center">
            <div className="text-sm font-bold text-white">{profile?.total_interactions || 0}</div>
            <div className="text-xs text-slate-400">Total Interactions</div>
          </div>
        </div>
        <div className="glass-panel rounded-2xl border border-white/8 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Code className="w-4 h-4 text-violet-400" /> Coding Profile
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-slate-400 mb-1">Primary Language</div>
              <div className="text-sm text-white font-mono">{profile?.primary_language || 'Not detected'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 mb-1.5">Also uses</div>
              <ChipList items={profile?.secondary_languages || []} />
            </div>
          </div>
        </div>
        <div className="glass-panel rounded-2xl border border-white/8 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Globe className="w-4 h-4 text-cyan-400" /> Preferences
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-slate-400 mb-1.5">Frameworks</div>
              <ChipList items={profile?.preferred_frameworks || []} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 mb-1">Reply Style</div>
              <div className="text-sm text-white capitalize">{profile?.reply_style || 'Not set'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed profile view / edit */}
      <div className="glass-panel rounded-2xl border border-white/8 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Star className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Full Learning Profile</h3>
          {editMode && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Editing</span>}
        </div>

        {editMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfileField label="Primary Language" value={primaryLang} onChange={setPrimaryLang} options={LANGUAGES} />
            <ProfileField label="Secondary Languages (comma-sep)" value={secondaryLangs} onChange={setSecondaryLangs} />
            <ProfileField label="Preferred Frameworks (comma-sep)" value={frameworks} onChange={setFrameworks} />
            <ProfileField label="Preferred AI Models (comma-sep)" value={aiModels} onChange={setAiModels} />
            <ProfileField label="Coding Style" value={codingStyle} onChange={setCodingStyle} />
            <ProfileField label="Reply Style" value={replyStyle} onChange={setReplyStyle} options={STYLES} />
            <ProfileField label="Writing Style" value={writingStyle} onChange={setWritingStyle} />
            <ProfileField label="Daily Routine" value={dailyRoutine} onChange={setDailyRoutine} />
            <ProfileField label="Work Habits" value={workHabits} onChange={setWorkHabits} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: 'Primary Language', value: profile?.primary_language || '—', icon: <Code className="w-3 h-3" /> },
              { label: 'Coding Style', value: profile?.coding_style || '—', icon: <Zap className="w-3 h-3" /> },
              { label: 'Reply Style', value: profile?.reply_style || '—', icon: <TrendingUp className="w-3 h-3" /> },
              { label: 'Writing Style', value: profile?.writing_style || '—', icon: <BookOpen className="w-3 h-3" /> },
              { label: 'Daily Routine', value: profile?.daily_routine || '—', icon: <Clock className="w-3 h-3" /> },
              { label: 'Work Habits', value: profile?.work_habits || '—', icon: <Star className="w-3 h-3" /> },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 font-mono uppercase tracking-wider">
                  {item.icon} {item.label}
                </div>
                <div className="text-sm text-slate-200">{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learning Events */}
      {stats?.recent_events?.length > 0 && (
        <div className="glass-panel rounded-2xl border border-white/8 p-6">
          <button
            onClick={() => setShowEvents(v => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white flex-1">Recent Learning Events</h3>
            {showEvents ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showEvents && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 space-y-2"
            >
              {stats.recent_events.map((e: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 glass-panel rounded-xl border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs text-white">{e.description}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {e.type} · {new Date(e.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">{Math.round(e.confidence * 100)}%</div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
