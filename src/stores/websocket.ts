import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useDebugStore } from '@/stores/debug';
import { LogLevel } from '@/types/LogLevel';

type Listener = (payload?: any) => void;

class Emitter {
  private listeners = new Map<string, Set<Listener>>();
  on(event: string, fn: Listener) {
    const s = this.listeners.get(event) ?? new Set();
    s.add(fn);
    this.listeners.set(event, s);
    return () => this.off(event, fn);
  }
  off(event: string, fn: Listener) {
    const s = this.listeners.get(event);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) this.listeners.delete(event);
  }
  emit(event: string, payload?: any) {
    const s = this.listeners.get(event);
    if (!s) return;
    for (const fn of Array.from(s)) fn(payload);
  }
}

export const useWebSocketStore = defineStore('websocket', () => {
  const isConnected = ref(false);
  const connectionTarget = ref<string | null>(null);
  const emitter = new Emitter();
  const debugStore = useDebugStore();

  let ws: WebSocket | null = null;
  let connectionTimeout: number | null = null;

  function connect(target: string) {
    if (ws) {
      ws.close();
    }

    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
    }

    connectionTarget.value = target;
    const wsUrl = target.startsWith('ws://') || target.startsWith('wss://') 
      ? target 
      : `ws://${target}:6969`;
    
    debugStore.addLog(LogLevel.INFO, `Connecting to WebSocket: ${wsUrl}`);
    
    ws = new WebSocket(wsUrl);
    
    debugStore.addLog(LogLevel.DEBUG, JSON.stringify(ws));

    connectionTimeout = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.CONNECTING) {
        debugStore.addLog(LogLevel.ERROR, `WebSocket connection timeout to ${target}`);
        ws.close();
        emitter.emit('error', new Error('Connection timeout'));
      }
    }, 10000);
    
    ws.onopen = () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      isConnected.value = true;
      debugStore.addLog(LogLevel.INFO, `WebSocket connected to ${target}`);
      emitter.emit('connected', { target });
    };
    
    ws.onmessage = (event) => {
      debugStore.addLog(LogLevel.DEBUG, `WebSocket message: ${event.data}`);
      try {
        const parsed = JSON.parse(event.data);
        emitter.emit('message', { raw: event.data, parsed });
      } catch (e) {
        emitter.emit('message', { raw: event.data, parsed: null });
      }
    };
    
    ws.onclose = () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      isConnected.value = false;
      connectionTarget.value = null;
      debugStore.addLog(LogLevel.INFO, `WebSocket disconnected from ${target}`);
      emitter.emit('disconnected');
    };
    
    ws.onerror = (error) => {
      debugStore.addLog(LogLevel.ERROR, `WebSocket error: ${error}`);
      emitter.emit('error', error);
    };
  }

  function disconnect() {
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    isConnected.value = false;
    connectionTarget.value = null;
  }

  function send(data: string | object) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      debugStore.addLog(LogLevel.ERROR, 'WebSocket not connected');
      throw new Error('WebSocket not connected');
    }
    
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    debugStore.addLog(LogLevel.DEBUG, `WebSocket send: ${payload}`);
    ws.send(payload);
  }

  return {
    isConnected,
    connectionTarget,
    connect,
    disconnect,
    send,
    on: (ev: string, fn: Listener) => emitter.on(ev, fn),
    off: (ev: string, fn: Listener) => emitter.off(ev, fn),
    emit: (ev: string, payload?: any) => emitter.emit(ev, payload)
  };
});