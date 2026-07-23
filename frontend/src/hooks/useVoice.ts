import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuthToken } from '../api/client';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface VoiceTranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  confidence?: number;
}

interface UseVoiceOptions {
  model?: string;
  language?: string;
  onStateChange?: (state: VoiceState) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecognition = any;

const WS_URL = (() => {
  const base = (import.meta.env.VITE_API_BASE_URL as string) || '';
  if (base.startsWith('http')) {
    return base.replace(/^http/, 'ws') + '/api/voice/ws';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/voice/ws`;
})();

export function useVoice(options: UseVoiceOptions = {}) {
  const { model = 'gemma', language = 'en-US', onStateChange } = options;

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<VoiceTranscriptEntry[]>([]);
  const [liveText, setLiveText] = useState('');
  const [aiText, setAiText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [latency, setLatency] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<AnyRecognition>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const heartbeatRef = useRef<number | null>(null);
  const continuousRef = useRef(false);
  const aiTextRef = useRef('');
  const startListeningRef = useRef<() => void>(() => { });

  const audioQueueRef = useRef<string[]>([]);
  const isPlayingAudioRef = useRef<boolean>(false);
  const isDoneReceivedRef = useRef<boolean>(false);

  const setState = useCallback((s: VoiceState) => {
    setVoiceState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  // ─── Real-Time Audio Queue Playback ───────────────────────────────────────

  const playNextAudioSegment = useCallback(() => {
    if (isPlayingAudioRef.current) return;
    if (audioQueueRef.current.length === 0) {
      if (isDoneReceivedRef.current) {
        setState('idle');
        if (continuousRef.current) {
          startListeningRef.current();
        }
      }
      return;
    }

    const nextUrl = audioQueueRef.current.shift()!;
    isPlayingAudioRef.current = true;
    setState('speaking');

    const audio = new Audio(nextUrl);
    audioRef.current = audio;

    const cleanupAndNext = () => {
      URL.revokeObjectURL(nextUrl);
      isPlayingAudioRef.current = false;
      playNextAudioSegment();
    };

    audio.onended = cleanupAndNext;
    audio.onerror = cleanupAndNext;
    audio.play().catch(cleanupAndNext);
  }, [setState]);

  const handleWSMessage = useCallback((data: Record<string, unknown>) => {
    switch (data.type) {
      case 'thinking':
        setState('thinking');
        aiTextRef.current = '';
        setAiText('');
        audioRef.current?.pause();
        audioQueueRef.current.forEach(u => URL.revokeObjectURL(u));
        audioQueueRef.current = [];
        isPlayingAudioRef.current = false;
        isDoneReceivedRef.current = false;
        startTimeRef.current = Date.now();
        break;

      case 'text_chunk': {
        const chunk = data.content as string;
        aiTextRef.current += chunk;
        setAiText(aiTextRef.current);
        break;
      }

      case 'audio_chunk': {
        const bytes = Uint8Array.from(atob(data.data as string), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        audioQueueRef.current.push(url);
        playNextAudioSegment();
        break;
      }

      case 'tts_fallback': {
        setState('speaking');
        const utterance = new SpeechSynthesisUtterance(data.text as string);
        utterance.onend = () => {
          setState('idle');
          if (continuousRef.current) startListeningRef.current();
        };
        window.speechSynthesis.speak(utterance);
        break;
      }

      case 'done': {
        const lat = Date.now() - startTimeRef.current;
        setLatency(lat);
        const finalText = aiTextRef.current;
        setTranscript(prev => [...prev, {
          id: (data.session_id as string) || crypto.randomUUID(),
          role: 'assistant',
          text: finalText,
          timestamp: new Date(),
        }]);
        aiTextRef.current = '';
        setAiText('');
        isDoneReceivedRef.current = true;
        playNextAudioSegment();
        break;
      }

      case 'error':
        setError(data.message as string);
        setState('error');
        setTimeout(() => setState('idle'), 3000);
        break;
    }
  }, [setState, playNextAudioSegment]);

  const connectWS = useCallback(() => {
    const token = getAuthToken();
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      heartbeatRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      setTimeout(() => { if (wsRef.current === ws) connectWS(); }, 3000);
    };

    ws.onerror = () => setIsConnected(false);

    ws.onmessage = (event: MessageEvent) => {
      try { handleWSMessage(JSON.parse(event.data)); } catch { /* ignore */ }
    };
  }, [handleWSMessage]);

  // ─── Speech Recognition ───────────────────────────────────────────────────

  const sendTranscript = useCallback((text: string, conf: number = 0) => {
    setTranscript(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: new Date(),
      confidence: Math.round(conf * 100),
    }]);
    setLiveText('');

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'transcript', text, model, confidence: conf, language,
      }));
    } else {
      setError('Not connected to voice server. Reconnecting…');
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [model, language, setState]);



  const startListeningFn = useCallback(() => {
    const SR: AnyRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) {
      setError('Speech recognition is not supported. Use Chrome or Edge.');
      setState('error');
      return;
    }

    // Clean up any active recognition instance first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch { /* ignore */ }
    }

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    setState('listening');
    setLiveText('');
    setError(null);

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          final += res[0].transcript;
          setConfidence(Math.round(res[0].confidence * 100));
        } else {
          interim += res[0].transcript;
        }
      }
      setLiveText(final || interim);
      if (final) sendTranscript(final, event.results[event.results.length - 1][0].confidence);
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') {
        setState('idle');
      } else {
        setError(`Speech error: ${e.error}`);
        setState('error');
        setTimeout(() => setError(null), 3000);
        setTimeout(() => setState('idle'), 3000);
      }
    };

    recognition.onend = () => {
      setVoiceState(s => s === 'listening' ? 'idle' : s);
    };

    recognition.start();
  }, [language, setState, sendTranscript]);

  useEffect(() => { startListeningRef.current = startListeningFn; }, [startListeningFn]);

  const stopListening = useCallback(() => {
    continuousRef.current = false;
    recognitionRef.current?.stop();
    setState('idle');
    setLiveText('');
  }, [setState]);

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause();
    window.speechSynthesis.cancel();
    audioQueueRef.current.forEach(u => URL.revokeObjectURL(u));
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
    isDoneReceivedRef.current = false;
    setState('idle');
  }, [setState]);

  const toggleContinuous = useCallback(() => {
    continuousRef.current = !continuousRef.current;
    if (continuousRef.current) startListeningFn();
    else stopListening();
  }, [startListeningFn, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setAiText('');
    setLiveText('');
    aiTextRef.current = '';
  }, []);

  // Connect on mount
  useEffect(() => {
    connectWS();
    return () => {
      wsRef.current?.close();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      recognitionRef.current?.stop();
    };
  }, [connectWS]);

  return {
    voiceState,
    transcript,
    liveText,
    aiText,
    confidence,
    latency,
    error,
    isConnected,
    startListening: startListeningFn,
    stopListening,
    stopSpeaking,
    toggleContinuous,
    clearTranscript,
    setTranscript,
    isContinuous: continuousRef.current,
  };
}
