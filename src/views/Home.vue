<script setup lang="ts">
import { ref, computed } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import LiquidGauge from '../components/LiquidGauge.vue';
import router from '../router';
import { Roller } from 'vue-roller';

const sliderValue = ref(50);
const percentage = ref(50);
const isOnline = ref(false);

const onSliderRelease = () =>
{
    percentage.value = sliderValue.value;
};

const fillColor = computed(() =>
{
    const p = sliderValue.value;
    let r, g, b;

    if (p >= 50)
    {
        const t = (p - 50) / 50;
        r = Math.round(255 * (1 - t) + 166 * t);
        g = Math.round(255 * (1 - t) + 227 * t);
        b = Math.round(0 * (1 - t) + 161 * t);
    } else
    {
        const t = p / 50;
        r = 255;
        g = Math.round(255 * t);
        b = 0;
    }

    return `rgb(${r},${g},${b})`;
});

const sliderBackground = computed(() =>
{
    return `linear-gradient(to right, ${fillColor.value} ${sliderValue.value}%, #333 ${sliderValue.value}%)`;
});

const knobLabelPosition = computed(() =>
{
    return `${sliderValue.value / 1.14}%`;
});
</script>

<template>
    <ion-page>
        <ion-content>
            <div class="flex flex-col justify-center items-center h-full px-8">
                <LiquidGauge :percentage="percentage" />
                <h1 class="text-4xl mt-4">Status</h1>
                <div v-if="isOnline" class="flex gap-2 flex-row justify-center items-center text-green-500">
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

                        <div class="knob-label-text text-slate-600 font-bold text-lg"
                            :style="{ left: knobLabelPosition }">
                            <Roller :duration="100" :value="sliderValue.toString()" />
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
    height: 16px;
    border-radius: 8px;
    outline: none;
    cursor: pointer;
    position: relative;
    margin-top: 24px;
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
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: v-bind(fillColor);
    cursor: grab;
    margin-top: -17px;
}

.custom-slider::-moz-range-thumb {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: v-bind(fillColor);
    cursor: grab;
}

.knob-label-text {
    position: absolute;
    width: 48px;
    height: 48px;
    top: 7px;
    pointer-events: none;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>