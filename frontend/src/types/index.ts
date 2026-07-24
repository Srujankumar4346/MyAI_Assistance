// Phase 3 — Extended Types for Neural Memory Engine

export type NavTab =
  'home' | 'chat' | 'memory' | 'settings' | 'logs' | 'about' | 'knowledge' | 'learning';

export interface User {
  username: string;
  token: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id?: number;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  created_at?: string;
}

// ── Phase 1/2 Memory (legacy, unchanged) ───────────────────────────────────
export interface MemoryItem {
  id: string;
  content: string;
  category: string;
}

// ── Phase 3 Enhanced Memory ────────────────────────────────────────────────
export interface EnhancedMemoryItem {
  id: string;
  content: string;
  summary?: string;
  memory_type: string;
  category: string;
  source: string;
  importance_score: number;
  confidence_score: number;
  access_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  project_name?: string;
  tags: string[];
  created_at: string;
  updated_at?: string;
  last_accessed?: string;
}

export interface MemoryStats {
  total_memories: number;
  pinned: number;
  archived: number;
  categories: Record<string, number>;
  types: Record<string, number>;
  avg_importance: number;
  health_score: number;
  top_memories: Array<{ id: string; content: string; importance: number }>;
  embedding_provider: string;
}

export interface TimelineGroup {
  period: string;
  memories: EnhancedMemoryItem[];
}

// ── Knowledge Graph ─────────────────────────────────────────────────────────
export interface KnowledgeNode {
  id: string;
  label: string;
  node_type: string;
  description?: string;
  importance: number;
  color: string;
  created_at: string;
}

export interface KnowledgeEdge {
  id: number;
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

// ── Learning Profile ────────────────────────────────────────────────────────
export interface LearningProfile {
  id: number;
  primary_language?: string;
  secondary_languages: string[];
  preferred_frameworks: string[];
  preferred_ai_models: string[];
  coding_style?: string;
  reply_style?: string;
  writing_style?: string;
  daily_routine?: string;
  work_habits?: string;
  learning_habits?: string;
  frequently_used_commands: string[];
  total_interactions: number;
  learning_score: number;
  updated_at?: string;
}

// ── System ──────────────────────────────────────────────────────────────────
export interface SystemMetrics {
  os: string;
  architecture: string;
  cpu_usage_percent: number;
  cpu_count: number;
  ram_total_gb: number;
  ram_used_gb: number;
  ram_usage_percent: number;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_usage_percent: number;
  app_name: string;
  app_version: string;
  server_time: string;
}

export interface AppSettings {
  theme: string;
  selected_model: string;
  memory_enabled: boolean;
  streaming_enabled: boolean;
  animation_enabled: boolean;
  auto_save_conversations: boolean;
}
