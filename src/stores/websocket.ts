import { defineStore } from 'pinia';
import { useDebugStore } from '@/stores/debug';
import { LogLevel } from '@/types/LogLevel';
import { Emitter } from '@/utils/Emitter';
import { WiFiEmitterEnum } from '@/types/WiFiEmitterEnum';

export const useWebSocketStore = defineStore('websocket', {
  state: () => ({
    isConnected: false as boolean,
    target: null as string | null,
    emitter: new Emitter(),
    ws: null as WebSocket | null,
  }),

  getters: {
    connected(state) {
      return state.isConnected;
    },
    currentTarget(state) {
      return state.target;
    }
  },

  actions: {
    connect(target: string) {
      const debugStore = useDebugStore();
      debugStore.addLog(LogLevel.DEBUG, `WebSocket connect called with target: ${target}`);

      if (this.ws) {
        debugStore.addLog(LogLevel.INFO, `WebSocket already exists, closing existing connection`);
        this.ws.close();
      }

      this.target = target;

      debugStore.addLog(LogLevel.INFO, `Connecting to WebSocket: ${target}`);

      this.ws = new WebSocket(target);

      this.ws.onopen = () => {
        this.isConnected = true;
        debugStore.addLog(LogLevel.INFO, `WebSocket connected to ${target}`);
        this.emitter.emit(WiFiEmitterEnum.CONNECTED, { target });
      };

      this.ws.onmessage = (event) => {
        debugStore.addLog(LogLevel.DEBUG, `WebSocket message: ${event.data}`);
        try {
          const message = JSON.parse(event.data);
          this.emitter.emit(WiFiEmitterEnum.MESSAGE, message);
        } catch (e) {
          debugStore.addLog(LogLevel.ERROR, `WebSocket message parse error: ${String(e)}`);
        }
      }

      this.ws.onclose = () => {
        this.isConnected = false;
        this.target = null;
        debugStore.addLog(LogLevel.INFO, `WebSocket disconnected from ${target}`);
        this.emitter.emit(WiFiEmitterEnum.DISCONNECTED);
      };

      this.ws.onerror = (error) => {
        debugStore.addLog(LogLevel.ERROR, `WebSocket error: ${JSON.stringify(error)}`);
      };
    },

    disconnect() {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.isConnected = false;
      this.target = null;
    },

    send(data: string | object) {
      const debugStore = useDebugStore();
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        debugStore.addLog(LogLevel.ERROR, 'WebSocket not connected');
        throw new Error('WebSocket not connected');
      }

      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      debugStore.addLog(LogLevel.DEBUG, `WebSocket send: ${payload}`);
      this.ws.send(payload);
    }
  }
});