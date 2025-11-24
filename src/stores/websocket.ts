import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useDebugStore } from '@/stores/debug';
import { LogLevel } from '@/types/LogLevel';
import { Emitter } from '@/utils/Emitter';
import { WEBSOCKET_PORT, WEBSOCKET_CONNECTION_TIMEOUT } from '@/constants';

export const useWebSocketStore = defineStore('websocket', () => {
  const isConnected = ref(false);
  const connectionTarget = ref<string | null>(null);
  const emitter = new Emitter();
  const debugStore = useDebugStore();

  let ws: WebSocket | null = null;
  let connectionTimeout: number | null = null;

  function connect(target: string) {
    debugStore.addLog(LogLevel.DEBUG, `WebSocket connect called with target: ${target}`);
    if (ws) {
      debugStore.addLog(LogLevel.INFO, `WebSocket already exists, closing existing connection`);
      ws.close();
    }

    if (connectionTimeout) {
      debugStore.addLog(LogLevel.INFO, `Clearing existing connection timeout`);
      clearTimeout(connectionTimeout);
    }

    connectionTarget.value = target;
    const wsUrl = target.startsWith('ws://') || target.startsWith('wss://') 
      ? target 
      : `ws://${target}:${WEBSOCKET_PORT}`;
    
    debugStore.addLog(LogLevel.INFO, `Connecting to WebSocket: ${wsUrl}`);
    
    ws = new WebSocket(wsUrl);
    
    debugStore.addLog(LogLevel.DEBUG, JSON.stringify(ws));

    connectionTimeout = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.CONNECTING) {
        debugStore.addLog(LogLevel.ERROR, `WebSocket connection timeout to ${target}`);
        ws.close();
        emitter.emit('error', new Error('Connection timeout'));
      }
    }, WEBSOCKET_CONNECTION_TIMEOUT);
    
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
      debugStore.addLog(LogLevel.ERROR, `WebSocket error: ${JSON.stringify(error)}`);
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
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    emit: emitter.emit.bind(emitter)
  };
});