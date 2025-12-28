import { LogEntry } from '@/types/LogEntry';
import { defineStore } from 'pinia';
import { ref } from 'vue';

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
  };

  const clearLogs = () => {
    logs.value = [];
  };

  const showConsole = () => {
    isVisible.value = true;
  };

  const hideConsole = () => {
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