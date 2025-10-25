<script setup lang="ts">
import { ref } from 'vue';
import { useDebugStore } from '@/stores/debug';
import MaterialSymbolsBugReport from '~icons/material-symbols/bug-report';
import MaterialSymbolsClose from '~icons/material-symbols/close';
import MaterialSymbolsDelete from '~icons/material-symbols/delete';
import MaterialSymbolsMinimize from '~icons/material-symbols/minimize';

const debugStore = useDebugStore();
const isOpen = ref(false);
const isDragging = ref(false);
const position = ref({ x: 50, y: 50 });

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { hour12: false });
};

const getLogColor = (level: string) => {
  const colors = {
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    debug: 'text-gray-400'
  };
  return colors[level as keyof typeof colors] || 'text-gray-400';
};

const handleStart = (e: MouseEvent | TouchEvent) => {
  isDragging.value = true;
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  const startX = clientX - position.value.x;
  const startY = clientY - position.value.y;

  const handleMove = (e: MouseEvent | TouchEvent) => {
    const moveX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const moveY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    position.value = {
      x: Math.max(0, Math.min(window.innerWidth - 60, moveX - startX)),
      y: Math.max(0, Math.min(window.innerHeight - 60, moveY - startY))
    };
  };

  const handleEnd = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);
  };

  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleEnd);
  document.addEventListener('touchmove', handleMove);
  document.addEventListener('touchend', handleEnd);
};
</script>

<template>
  <div v-if="debugStore.isVisible" class="debug-console" :style="{ left: position.x + 'px', top: position.y + 'px' }">
    <div 
      v-if="!isOpen"
      class="debug-icon"
      @mousedown="handleStart"
      @touchstart="handleStart"
      @click="!isDragging && (isOpen = true)"
    >
      <MaterialSymbolsBugReport class="text-2xl" />
    </div>
    
    <div v-else class="debug-panel">
      <div class="debug-header" @mousedown="handleStart" @touchstart="handleStart">
        <span>Debug Console</span>
        <div class="debug-controls">
          <MaterialSymbolsDelete 
            class="control-btn" 
            @click="debugStore.clearLogs()" 
            title="Clear logs"
          />
          <MaterialSymbolsMinimize 
            class="control-btn" 
            @click="isOpen = false" 
            title="Minimize"
          />
          <MaterialSymbolsClose 
            class="control-btn" 
            @click="debugStore.hideConsole()" 
            title="Close"
          />
        </div>
      </div>
      
      <div class="debug-logs">
        <div 
          v-for="log in debugStore.logs" 
          :key="log.id" 
          class="log-entry"
        >
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <span class="log-level" :class="getLogColor(log.level)">[{{ log.level.toUpperCase() }}]</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
        <div v-if="debugStore.logs.length === 0" class="no-logs">
          No logs yet
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.debug-console {
  position: fixed;
  z-index: 9999;
  user-select: none;
}

.debug-icon {
  width: 50px;
  height: 50px;
  background: #333;
  border: 2px solid #555;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.debug-panel {
  width: 400px;
  height: 300px;
  background: #1a1a1a;
  border: 2px solid #333;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.debug-header {
  padding: 12px;
  background: #333;
  border-bottom: 1px solid #555;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  color: #fff;
  font-weight: bold;
}

.debug-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.control-btn:hover {
  background: #555;
}

.debug-logs {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  font-family: monospace;
  font-size: 12px;
}

.log-entry {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px solid #333;
}

.log-time {
  color: #888;
  min-width: 70px;
}

.log-level {
  min-width: 60px;
  font-weight: bold;
}

.log-message {
  color: #ccc;
  flex: 1;
  word-break: break-word;
}

.no-logs {
  color: #666;
  text-align: center;
  padding: 20px;
}
</style>
