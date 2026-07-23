import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('novax_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('novax_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('novax_token');
}

// Create Axios Instance
const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to attach JWT token
client.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor to handle 401 unauthorized errors
client.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401 && error.config.url !== '/login') {
    removeAuthToken();
    window.location.reload();
  }
  return Promise.reject(error);
});

export const api = {
  login: async (credentials: any) => {
    const res = await client.post('/login', credentials);
    return res.data;
  },
  logout: async () => {
    const res = await client.post('/logout');
    return res.data;
  },
  getHealth: async () => {
    const res = await client.get('/health');
    return res.data;
  },
  getSystem: async () => {
    const res = await client.get('/system');
    return res.data;
  },
  getLogs: async () => {
    const res = await client.get('/logs');
    return res.data;
  },
  getModels: async () => {
    const res = await client.get('/models');
    return res.data;
  },
  getHistory: async () => {
    const res = await client.get('/history');
    return res.data;
  },
  getMessages: async (chatId: string) => {
    const res = await client.get(`/history/${chatId}`);
    return res.data;
  },
  deleteChat: async (chatId: string) => {
    const res = await client.delete(`/history/${chatId}`);
    return res.data;
  },
  getMemories: async () => {
    const res = await client.get('/memory');
    return res.data;
  },
  addMemory: async (memory: { content: string; category?: string }) => {
    const res = await client.post('/memory', memory);
    return res.data;
  },
  deleteMemory: async (id: string) => {
    const res = await client.delete(`/memory/${id}`);
    return res.data;
  },
  getSettings: async () => {
    const res = await client.get('/settings');
    return res.data;
  },
  updateSettings: async (settings: any) => {
    const res = await client.post('/settings', settings);
    return res.data;
  },
  // ─── Phase 2: Voice API ───────────────────────────────────────────────────
  getVoices: async () => {
    const res = await client.get('/voice/voices');
    return res.data;
  },
  getVoiceSettings: async () => {
    const res = await client.get('/voice/settings');
    return res.data;
  },
  updateVoiceSettings: async (settings: any) => {
    const res = await client.post('/voice/settings', settings);
    return res.data;
  },
  speak: async (payload: { text: string; voice?: string; speed?: number; pitch?: number }) => {
    const res = await client.post('/voice/speak', payload);
    return res.data;
  },
  getVoiceHistory: async () => {
    const res = await client.get('/voice/history');
    return res.data;
  },
  clearVoiceHistory: async () => {
    const res = await client.delete('/voice/history');
    return res.data;
  },
};
