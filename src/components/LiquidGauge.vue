<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { Roller } from "vue-roller";
import "vue-roller/dist/style.css";

interface Props {
  percentage: number;
}

const props = defineProps<Props>();

const clamped = computed(() => Math.min(100, Math.max(0, props.percentage)));

const fillColor = computed(() => {
  const p = clamped.value;
  let r, g, b;
  
  if (p >= 50) {
    const t = (p - 50) / 50;
    r = Math.round(255 * (1 - t) + 166 * t);
    g = Math.round(255 * (1 - t) + 227 * t);
    b = Math.round(0 * (1 - t) + 161 * t);
  } else {
    const t = p / 50;
    r = 255;
    g = Math.round(255 * t);
    b = 0;
  }
  
  return `rgb(${r},${g},${b})`;
});

const currentLevel = ref(0);
const targetLevel = computed(() => 205 - (clamped.value / 100) * 200);

const wave1Path = ref('');
const wave2Path = ref('');
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
    <svg viewBox="0 0 200 200" class="gauge-svg">
      <defs>
        <clipPath id="clip-circle">
          <circle cx="100" cy="100" r="95" />
        </clipPath>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" :stop-color="fillColor" stop-opacity="0.8" />
          <stop offset="100%" :stop-color="fillColor" stop-opacity="1" />
        </linearGradient>
      </defs>
      
      <circle cx="100" cy="100" r="95" fill="#1a1a1a" stroke="#333" stroke-width="2" />

      <g clip-path="url(#clip-circle)">
        <path :d="wave2Path" fill="url(#waveGradient)" opacity="0.6" />
        <path :d="wave1Path" :fill="fillColor" opacity="0.8" />
      </g>
    </svg>
    <div class="percentage-panel" :style="{color: fillColor}">
        <Roller :duration="100" :value="clamped.toString()"/>
        <span>%</span>
    </div>
    <div class="customize-button">
      Customize
    </div>
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
  right: -10%;
  background-color: #333;
  border: #626262 1px solid;
  padding-top: 8px;
  padding-bottom: 8px;
  padding-left: 12px;
  padding-right: 12px;
  border-radius: 20px;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  transition: background-color 0.3s, color 0.3s;
}

.percentage-text {
  text-shadow: 0 0 10px rgba(0,0,0,0.8);
}
</style>