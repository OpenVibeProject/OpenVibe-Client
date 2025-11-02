<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import LiquidGauge from '../components/LiquidGauge.vue';
import router from '../router';
import { Roller } from 'vue-roller';
import { getIntensityColor } from '../utils/colorUtils';

const sliderValue = ref(50);
const percentage = ref(50);
const isOnline = ref(false);

const onSliderRelease = () =>
{
    percentage.value = sliderValue.value;
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
    for (let i = 0; i <= 50; i += 1)
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
                <LiquidGauge :battery="percentage" :intensity="percentage" />
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
                            class="custom-slider w-full" :style="{ background: sliderBackground }"
                            @change="onSliderRelease" />

                        <div :class="sliderValue > 40 ? 'text-black' : 'text-white'" class="slider-center-text mt-2 font-bold text-xl">
                            <Roller :duration="100" :value="rollerValue" />
                        </div>

                    </div>
                </div>

                <span class="btn bg-blue-500 rounded-lg p-2 mt-6 cursor-pointer hover:bg-blue-600 transition"
                    @click="router.push('/bluetooth-setup')">
                    Go To Bluetooth
                </span>
                <span class="btn bg-blue-500 rounded-lg p-2 mt-4 cursor-pointer hover:bg-blue-600 transition"
                    @click="router.push('/wifi-setup')">
                    Go To WiFi
                </span>
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
</style>