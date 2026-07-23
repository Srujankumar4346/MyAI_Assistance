/**
 * useVoice — Custom hook for NOVA_X real-time voice assistant.
 *
 * Features:
 *  • WebSocket with exponential-backoff reconnect (1→2→4→8→16→30s max)
 *  • Speech-to-Text via Web Speech API (Chrome/Edge)
 *  • Real-time audio queue playback (sentence-level TTS from backend)
 *  • Microphone device selection (enumerateDevices)
 *  • Speaker device selection (setSinkId)
 *  • Web Audio API noise reduction pipeline (high-pass + compressor + gain)
 *  • Continuous listening mode
 *  • Heartbeat ping/pong
 */

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

export interface AudioDevice {
  deviceId: string;
  label: string;
}

interface UseVoiceOptions {
  model?: string;
  language?: string;
  microphoneDeviceId?: string;
  speakerDeviceId?: string;
  noiseReduction?: boolean;
  onStateChange?: (state: VoiceState) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecognition = any;

// ── WebSocket URL resolution ───────────────────────────────────────────────────
const WS_URL = (() => {
  const base = (import.meta.env.VITE_API_BASE_URL as string) || '';
  if (base.startsWith('http')) {
    return base.replace(/^http/, 'ws') + '/api/voice/ws';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/voice/ws`;
})();

// ── Reconnect constants ────────────────────────────────────────────────────────
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

// ── Noise reduction pipeline ──────────────────────────────────────────────────
function buildNoisePipeline(
  ctx: AudioContext,
  source: MediaStreamAudioSourceNode
): AudioNode {
  // High-pass filter — removes low-frequency rumble/hum below 100 Hz
  const highPass = ctx.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.value = 100;
  highPass.Q.value = 0.7;

  // Dynamics compressor — smooths loud transients
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -30;
  compressor.knee.value = 10;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  // Output gain — restore level after compression
  const gain = ctx.createGain();
  gain.gain.value = 1.2;

  source.connect(highPass);
  highPass.connect(compressor);
  compressor.connect(gain);
  gain.connect(ctx.destination);

  return gain;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const {
    model = 'gemma',
    language = 'en-US',
    microphoneDeviceId,
    speakerDeviceId,
    noiseReduction = true,
    onStateChange,
  } = options;

  // ── State ──────────────────────────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<VoiceTranscriptEntry[]>([]);
  const [liveText, setLiveText] = useState('');
  const [aiText, setAiText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [latency, setLatency] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<AnyRecognition>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const continuousRef = useRef(false);
  const aiTextRef = useRef('');
  const startListeningRef = useRef<() => void>(() => {});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Audio queue
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingAudioRef = useRef<boolean>(false);
  const isDoneReceivedRef = useRef<boolean>(false);

  const setState = useCallback((s: VoiceState) => {
    setVoiceState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  // ── Audio queue playback ───────────────────────────────────────────────────
  const playNextAudioSegment = useCallback(() => {
    if (isPlayingAudioRef.current) return;
    if (audioQueueRef.current.length === 0) {
      if (isDoneReceivedRef.current) {
        setState('idle');
        if (continuousRef.current) startListeningRef.current();
      }
      return;
    }

    const nextUrl = audioQueueRef.current.shift()!;
    isPlayingAudioRef.current = true;
    setState('speaking');

    const audio = new Audio(nextUrl);
    audioRef.current = audio;

    // Apply speaker device if supported
    if (speakerDeviceId && typeof (audio as any).setSinkId === 'function') {
      (audio as any).setSinkId(speakerDeviceId).catch((e: Error) => {
        console.warn('[Speaker] setSinkId failed:', e);
      });
    }

    const cleanupAndNext = () => {
      URL.revokeObjectURL(nextUrl);
      isPlayingAudioRef.current = false;
      playNextAudioSegment();
    };
    audio.onended = cleanupAndNext;
    audio.onerror = cleanupAndNext;
    audio.play().catch(cleanupAndNext);
  }, [setState, speakerDeviceId]);

  // ── WebSocket message handler ──────────────────────────────────────────────
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
        setTimeout(() => { setError(null); setState('idle'); }, 3000);
        break;

      case 'pong':
        // heartbeat acknowledged — no action needed
        break;
    }
  }, [setState, playNextAudioSegment]);

  // ── WebSocket connection with exponential backoff ──────────────────────────
  const connectWS = useCallback(() => {
    const token = getAuthToken();
    if (!token) return;

    // Clear any pending reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      // Reset backoff on successful connection
      reconnectAttemptRef.current = 0;
      setReconnectAttempt(0);

      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);

      // Exponential backoff reconnect
      const attempt = reconnectAttemptRef.current;
      const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
      reconnectAttemptRef.current = attempt + 1;
      setReconnectAttempt(attempt + 1);

      console.info(`[Voice WS] Reconnecting in ${delay}ms (attempt ${attempt + 1})`);
      reconnectTimerRef.current = setTimeout(() => {
        if (wsRef.current === ws) connectWS();
      }, delay);
    };

    ws.onerror = () => setIsConnected(false);

    ws.onmessage = (event: MessageEvent) => {
      try { handleWSMessage(JSON.parse(event.data)); } catch { /* ignore */ }
    };
  }, [handleWSMessage]);

  // ── Speech recognition with optional noise reduction ──────────────────────
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
      wsRef.current.send(JSON.stringify({ type: 'transcript', text, model, confidence: conf, language }));
    } else {
      setError('Not connected to voice server. Reconnecting…');
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [model, language, setState]);

  const startListeningFn = useCallback(async () => {
    const SR: AnyRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) {
      setError('Speech recognition not supported. Use Chrome or Edge.');
      setState('error');
      return;
    }

    // ── Noise reduction via Web Audio API ────────────────────────────────────
    if (noiseReduction && navigator.mediaDevices?.getUserMedia) {
      try {
        const constraints: MediaStreamConstraints = {
          audio: {
            deviceId: microphoneDeviceId ? { exact: microphoneDeviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        micStreamRef.current = stream;

        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new AudioContext();
        }
        const source = audioCtxRef.current.createMediaStreamSource(stream);
        buildNoisePipeline(audioCtxRef.current, source);
      } catch (e) {
        console.warn('[Noise] AudioContext setup failed, using plain recognition:', e);
      }
    }

    // Clean up previous recognition instance
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
        setTimeout(() => { setError(null); setState('idle'); }, 3000);
      }
    };

    recognition.onend = () => {
      setVoiceState(s => s === 'listening' ? 'idle' : s);
    };

    recognition.start();
  }, [language, microphoneDeviceId, noiseReduction, setState, sendTranscript]);

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

  // Connect on mount, clean up on unmount
  useEffect(() => {
    connectWS();
    return () => {
      wsRef.current?.close();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      recognitionRef.current?.stop();
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
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
    reconnectAttempt,
    startListening: startListeningFn,
    stopListening,
    stopSpeaking,
    toggleContinuous,
    clearTranscript,
    setTranscript,
    isContinuous: continuousRef.current,
  };
}

// ── Device enumeration utilities ───────────────────────────────────────────────

export async function getAudioInputDevices(): Promise<AudioDevice[]> {
  try {
    // Request permission first so labels are populated
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'audioinput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`,
      }));
  } catch {
    return [];
  }
}

export async function getAudioOutputDevices(): Promise<AudioDevice[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'audiooutput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Speaker ${i + 1}`,
      }));
  } catch {
    return [];
  }
}
