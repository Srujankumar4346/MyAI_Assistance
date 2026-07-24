import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

// Define the standard event schema we expect from the WebSocket Broadcaster
export interface BrowserEvent {
  event_id: string;
  timestamp: number;
  channel: string;
  event_type: string;
  payload: any;
  version: string;
  source: string;
}

interface BrowserWebSocketContextType {
  isConnected: boolean;
  error: string | null;
  subscribe: (channel: string, callback: (event: BrowserEvent) => void) => () => void;
  sendMessage: (action: string, payload: any) => void;
}

const BrowserWebSocketContext = createContext<BrowserWebSocketContextType>({
  isConnected: false,
  error: null,
  subscribe: () => () => {},
  sendMessage: () => {},
});

export const useBrowserWebSocket = () => useContext(BrowserWebSocketContext);

interface ProviderProps {
  children: React.ReactNode;
  token: string;
}

export const BrowserWebSocketProvider: React.FC<ProviderProps> = ({ children, token }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Map<string, Set<(e: BrowserEvent) => void>>>(new Map());

  useEffect(() => {
    // Determine the WS URL (handling dev vs prod relative paths)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use hardcoded backend port for local dev
    const wsUrl = `${protocol}//localhost:8000/ws/browser?token=${token}`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        // Resubscribe to all active channels upon connection
        const activeChannels = Array.from(subscribersRef.current.keys());
        if (activeChannels.length > 0) {
          ws.send(JSON.stringify({ action: 'subscribe', channels: activeChannels }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data: BrowserEvent = JSON.parse(event.data);
          const channelSubs = subscribersRef.current.get(data.channel);
          if (channelSubs) {
            channelSubs.forEach((cb) => cb(data));
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Simple reconnect logic (in prod we'd want exponential backoff)
        const backoff = Math.min(30000, 1000 * Math.pow(2, Math.floor(Math.random() * 5)) + Math.random() * 1000);
        setTimeout(connect, backoff);
      };

      ws.onerror = () => {
        setError('WebSocket connection failed.');
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token]);

  const subscribe = (channel: string, callback: (event: BrowserEvent) => void) => {
    let subs = subscribersRef.current.get(channel);
    if (!subs) {
      subs = new Set();
      subscribersRef.current.set(channel, subs);
      // Tell server we want this channel
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'subscribe', channels: [channel] }));
      }
    }
    subs.add(callback);

    // Return unsubscribe function
    return () => {
      const currentSubs = subscribersRef.current.get(channel);
      if (currentSubs) {
        currentSubs.delete(callback);
        if (currentSubs.size === 0) {
          subscribersRef.current.delete(channel);
        }
      }
    };
  };

  const sendMessage = (action: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...payload }));
    }
  };

  return (
    <BrowserWebSocketContext.Provider value={{ isConnected, error, subscribe, sendMessage }}>
      {children}
    </BrowserWebSocketContext.Provider>
  );
};
