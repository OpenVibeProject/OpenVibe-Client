import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export const useDebugStore = defineStore('debug', () => {
  const logs = ref<LogEntry[]>([]);
  const isVisible = ref(false);
  let logId = 0;

  const addLog = (level: LogEntry['level'], message: string) => {
    logs.value.push({
      id: logId++,
      timestamp: new Date(),
      level,
      message
    });
    
    if (logs.value.length > 100) {
      logs.value.shift();
    }
  };

  const clearLogs = () => {
    logs.value = [];
  };

  const showConsole = () => {
    addLog('info', 'Debug console opened');
    isVisible.value = true;
  };

  const hideConsole = () => {
    addLog('info', 'Debug console closed');
    isVisible.value = false;
  };

  return {
    logs,
    isVisible,
    addLog,
    clearLogs,
    showConsole,
    hideConsole
  };
});