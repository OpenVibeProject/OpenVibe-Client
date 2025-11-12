<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { Roller } from "vue-roller";
import "vue-roller/dist/style.css";
import vibrator from '/vibrator.png'
import { getIntensityColor, getIntensityGradient } from '../utils/colorUtils';
import SettingsModal from './SettingsModal.vue';

interface Props {
  battery: number;
  intensity: number;
}

const props = defineProps<Props>();

const showSettingsModal = ref(false);

const openSettings = () => {
  showSettingsModal.value = true;
};

const closeSettings = () => {
  showSettingsModal.value = false;
};

const clamped = computed(() => Math.min(100, Math.max(0, props.battery)));

const fillColor = computed(() => getIntensityColor(clamped.value));
const gradientStops = computed(() => getIntensityGradient(clamped.value));

const currentLevel = ref(0);
const targetLevel = computed(() => 205 - (clamped.value / 100) * 200);

const wave1Path = ref('');
const wave2Path = ref('');
const shakeSpeed = computed(() => props.intensity > 0 ? Math.max(0.1, 0.5 - (props.intensity / 100) * 0.4) : 0);
let animationId: number;
let time = 0;

const generateWavePath = (offset: number, amplitude: number) => {
  const points = [];
  const width = 220;
  
  for (let x = -10; x <= width; x += 2) {
    const y = currentLevel.value + Math.sin((x + offset) * 0.02) * amplitude;
    points.push(`${x},${y}`);
  }
  
  return `M${points.join(' L')} L${width},220 L-10,220 Z`;
};

const animate = () => {
  const diff = targetLevel.value - currentLevel.value;
  currentLevel.value += diff * 0.05;
  
  time += 1;
  wave1Path.value = generateWavePath(time * 2, 8);
  wave2Path.value = generateWavePath(time * 1.5 + 50, 6);
  animationId = requestAnimationFrame(animate);
};

onMounted(() => {
  currentLevel.value = targetLevel.value;
  animate();
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
});
</script>

<template>
  <div class="gauge">
    <img class="vibrator absolute rotate-15 w-45 bottom-[-15px] left-10" :style="props.intensity > 0 ? { animationDuration: `${shakeSpeed}s` } : {}" :class="{ 'shake-animation': props.intensity > 0 }" :src="vibrator">
    <svg viewBox="0 0 200 200" class="gauge-svg">
      <defs>
        <clipPath id="clip-circle">
          <circle cx="100" cy="100" r="95" />
        </clipPath>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop v-for="stop in gradientStops" :key="stop.position" :offset="`${stop.position}%`" :stop-color="stop.color" />
        </linearGradient>
      </defs>
      
      <circle cx="100" cy="100" r="95" fill="#1a1a1a" stroke="#333" stroke-width="2" />

      <g clip-path="url(#clip-circle)">
        <path :d="wave2Path" fill="url(#waveGradient)" opacity="0.6" />
        <path :d="wave1Path" fill="url(#waveGradient)" opacity="0.8" />
      </g>
    </svg>
    <div class="percentage-panel" :style="{color: fillColor}">
        <Roller :duration="100" :value="clamped.toString()"/>
        <span>%</span>
    </div>
    <div class="customize-button text-xl flex flex-row gap-1 cursor-pointer" @click="openSettings">
      Settings
    </div>
    
    <SettingsModal 
      :is-open="showSettingsModal" 
      @dismiss="closeSettings" 
    />
  </div>
</template>

<style scoped>
.gauge {
  width: 250px;
  height: 250px;
  position: relative; 
}

.gauge-svg {
  width: 100%;
  height: 100%;
}

.percentage-panel {
  position: absolute;
  top: 5%;
  left: 5%;
  width: 40%;
  background-color: #333;
  border: #626262 1px solid;
  padding-top: 10px;
  padding-bottom: 10px;
  border-radius: 20px;
  font-size: 1.5em;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
}

.customize-button {
  position: absolute;
  bottom: 20%;
  right: -8%;
  background-color: #333;
  border: #626262 1px solid;
  padding-top: 8px;
  padding-bottom: 8px;
  padding-left: 12px;
  padding-right: 12px;
  border-radius: 20px;
  font-weight: bold;
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
}

.percentage-text {
  text-shadow: 0 0 10px rgba(0,0,0,0.8);
}

.shake-animation {
  animation: shake infinite;
}

@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(1deg); }
  10% { transform: translate(-1px, -2px) rotate(2deg); }
  20% { transform: translate(-3px, 0px) rotate(3deg); }
  30% { transform: translate(3px, 2px) rotate(0deg); }
  40% { transform: translate(1px, -1px) rotate(2deg); }
  50% { transform: translate(-1px, 2px) rotate(1deg); }
  60% { transform: translate(-3px, 1px) rotate(0deg); }
  70% { transform: translate(3px, 1px) rotate(3deg); }
  80% { transform: translate(-1px, -1px) rotate(2deg); }
  90% { transform: translate(1px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -2px) rotate(1deg); }
}
</style>