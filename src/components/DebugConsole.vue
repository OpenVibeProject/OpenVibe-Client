<script setup lang="ts">
import { ref, watch, nextTick, onMounted, type CSSProperties } from 'vue';
import { useDebugStore } from '@/stores/debug';
import MaterialSymbolsBugReport from '~icons/material-symbols/bug-report';
import MaterialSymbolsClose from '~icons/material-symbols/close';
import MaterialSymbolsDelete from '~icons/material-symbols/delete';
import MaterialSymbolsMinimize from '~icons/material-symbols/minimize';
import MaterialSymbolsContentCopy from '~icons/material-symbols/content-copy';

const debugStore = useDebugStore();
const isOpen = ref(false);
const isDragging = ref(false);
const position = ref({ x: 50, y: 50 });
const logsContainer = ref<HTMLElement | null>(null);

// Style for minimized draggable icon
const iconStyle = (): CSSProperties => ({
  position: 'fixed',
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  zIndex: 9999,
  pointerEvents: 'auto',
});

const copyAll = async () => {
  try {
    const lines = debugStore.logs.map(
      (l) => `${formatTime(l.timestamp)} [${l.level.toUpperCase()}] ${l.message}`
    );
    const text = lines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      debugStore.addLog('info', 'Copied debug console content to clipboard');
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      debugStore.addLog('info', 'Copied debug console content to clipboard (fallback)');
    }
  } catch (e) {
    debugStore.addLog('error', `Failed to copy debug logs: ${e}`);
  }
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { hour12: false });
};

const getLogColor = (level: string) => {
  const colors = {
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    debug: 'text-gray-400',
  };
  return colors[level as keyof typeof colors] || 'text-gray-400';
};

// Draggable behavior for minimized icon
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
      y: Math.max(0, Math.min(window.innerHeight - 60, moveY - startY)),
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

// Auto-scroll to newest log
watch(
  () => debugStore.logs.length,
  async () => {
    await nextTick();
    if (logsContainer.value) {
      try {
        logsContainer.value.scrollTo({
          top: logsContainer.value.scrollHeight,
          behavior: 'smooth',
        });
      } catch {
        logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
      }
    }
  }
);

onMounted(async () => {
  await nextTick();
  if (logsContainer.value) logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
});
</script>

<template>
  <div v-if="debugStore.isVisible">
    <!-- Minimized draggable icon -->
    <div
      v-if="!isOpen"
      class="debug-icon"
      :style="iconStyle()"
      @mousedown="handleStart"
      @touchstart="handleStart"
      @click="!isDragging && (isOpen = true)"
    >
      <MaterialSymbolsBugReport class="text-2xl" />
    </div>

    <!-- Fullscreen Debug Panel -->
    <div v-else class="debug-panel fullscreen">
      <div class="debug-header">
        <span>Debug Console</span>
        <div class="debug-controls">
          <MaterialSymbolsDelete
            class="control-btn"
            @click="debugStore.clearLogs()"
            title="Clear logs"
          />
          <MaterialSymbolsContentCopy
            class="control-btn"
            @click="copyAll()"
            title="Copy all logs"
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

      <div class="debug-logs" ref="logsContainer">
        <div v-for="log in debugStore.logs" :key="log.id" class="log-entry">
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <span class="log-level" :class="getLogColor(log.level)">
            [{{ log.level.toUpperCase() }}]
          </span>
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

.debug-panel.fullscreen {
  position: fixed;
  inset: 0;
  top: 5vh;
  width: 100vw;
  height: 95vh;
  background: #1a1a1a;
  border: 2px solid #333;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 10000;
}

.debug-header {
  padding: 12px;
  background: #333;
  border-bottom: 1px solid #555;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  user-select: text;
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
