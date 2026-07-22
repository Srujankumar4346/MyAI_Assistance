export type NavTab = 'home' | 'chat' | 'memory' | 'settings' | 'logs' | 'about';

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

export interface MemoryItem {
  id: string;
  content: string;
  category: string;
}

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
