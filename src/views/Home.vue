<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import LiquidGauge from '../components/LiquidGauge.vue';
import { Roller } from 'vue-roller';
import { getIntensityColor } from '../utils/colorUtils';
import { useVibratorStore } from '@/stores/vibrator';

const vibratorStore = useVibratorStore();

const sliderValue = ref(0);
const _animToken = ref(0);
const battery = computed(() => vibratorStore.status?.battery || 0);
const intensity = computed(() => vibratorStore.status?.intensity || 0);
const isOnline = computed(() => vibratorStore.isConnected);

watch(
    () => vibratorStore.status?.intensity,
    async (newVal) =>
    {
        if (newVal === undefined) return;

        _animToken.value += 1;
        const token = _animToken.value;

        const start = Math.round(sliderValue.value);
        const target = Math.round(newVal);
        if (start === target) {
            sliderValue.value = target;
            return;
        }

        const step = target > start ? 1 : -1;
        const diff = Math.abs(target - start);

        const totalDuration = Math.min(300, 12 * diff + 60);
        const delay = Math.max(6, Math.round(totalDuration / diff));
        for (let i = start; i !== target; i += step)
        {
            if (token !== _animToken.value) return;
            sliderValue.value = i + step;
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        if (token === _animToken.value) sliderValue.value = target;
    },
    { immediate: true }
);

const onSliderRelease = () =>
{
    vibratorStore.setIntensity(sliderValue.value);
};

const fillColor = computed(() => getIntensityColor(sliderValue.value));

const sliderBackground = computed(() =>
{
    const baseColor = fillColor.value;
    const match = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
        const [, r, g, b] = match.map(Number);
        const lightColor = `rgb(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)})`;
        const darkColor = `rgb(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(0, b - 50)})`;
        return `linear-gradient(to right, ${lightColor} 0%, ${baseColor} ${sliderValue.value/2}%, ${darkColor} ${sliderValue.value}%, #333 ${sliderValue.value}%)`;
    }
    return `linear-gradient(to right, ${baseColor} 0%, ${baseColor} ${sliderValue.value}%, #333 ${sliderValue.value}%)`;
});

const rollerValue = computed(() => `${sliderValue.value}%`);

onMounted(async () =>
{
    for (let i = 50; i >= 0; i -= 1)
    {
        sliderValue.value = i;
        await new Promise((resolve) => setTimeout(resolve, 1));
    }
});
</script>

<template>
    <ion-page>
        <ion-content>
            <div class="flex flex-col justify-center items-center h-full px-8">
                <div v-if="!vibratorStore.isOwnDevice" class="alert text-lg mb-24">You are controlling a remote device</div>
                <LiquidGauge :battery="battery" :intensity="intensity" />
                <h1 class="text-4xl mt-4">Status</h1>
                <div v-if="isOnline" class="flex gap-2 flex-row justify-center items-center text-green-400">
                    <h2 class="text-lg">⬤</h2>
                    <h2 class="text-lg mt-1">Online</h2>
                </div>
                <div v-else class="flex gap-2 flex-row justify-center items-center text-red-500">
                    <h2 class="text-lg">⬤</h2>
                    <h2 class="text-lg mt-1">Offline</h2>
                </div>

                <div class="w-full max-w-sm mt-8">
                    <h1 class="text-2xl">Intensity</h1>
                    <div class="relative w-full">
                        <input type="range" min="0" max="100" step="1" v-model="sliderValue"
                            class="custom-slider w-full" :class="{ 'disabled': !isOnline }"
                            :style="{ background: sliderBackground }"
                            :disabled="!isOnline"
                            @change="onSliderRelease" />

                        <div :class="sliderValue > 40 ? 'text-black' : 'text-white'" class="slider-center-text mt-2 font-bold text-xl">
                            <Roller :duration="100" :value="rollerValue" />
                        </div>

                    </div>
                </div>
            </div>
        </ion-content>
    </ion-page>
</template>

<style scoped>
ion-content {
    --background: #000000;
}

.custom-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 24px;
    border-radius: 15px;
    outline: none;
    cursor: pointer;
    position: relative;
    margin-top: 20px;
}

.custom-slider::-webkit-slider-runnable-track {
    height: 14px;
    border-radius: 8px;
}

.custom-slider::-moz-range-track {
    height: 14px;
    border-radius: 8px;
}

.custom-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: v-bind(fillColor);
    cursor: grab;
    margin-top: -10px;
}

.custom-slider::-moz-range-thumb {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: v-bind(fillColor);
    cursor: grab;
}

.custom-slider.disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.custom-slider.disabled::-webkit-slider-thumb {
    cursor: not-allowed;
    background: #666;
}

.custom-slider.disabled::-moz-range-thumb {
    cursor: not-allowed;
    background: #666;
}

.slider-center-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.alert {
    background-color: #333;
    color: #fff;
    padding: 12px 20px;
    border-radius: 8px;
    text-align: center;
    border: 1px solid #555;
}
</style>