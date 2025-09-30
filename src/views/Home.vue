<script setup lang="ts">
import { ref } from 'vue';
import { IonPage, IonContent, IonRange } from '@ionic/vue';
import LiquidGauge from '../components/LiquidGauge.vue';
import router from '../router';

const sliderValue = ref(50);
const percentage = ref(50);

const onSliderRelease = () => {
    percentage.value = sliderValue.value;
    // send network call or bluetooth command to update intensity
};

</script>

<template>
    <ion-page>
        <ion-content>
            <div class="flex flex-col justify-center items-center h-full px-8">
                <LiquidGauge :percentage="percentage" />
                <div class="w-full max-w-sm mt-8">
                    <label class="block text-center mb-4 text-lg font-medium">Intensity</label>
                    <ion-range 
                        v-model="sliderValue" 
                        :min="0" 
                        :max="100" 
                        :step="1"
                        color="primary"
                        class="mb-4"
                        @ionKnobMoveEnd="onSliderRelease"
                    ></ion-range>
                </div>
                <span class="btn bg-blue-500 rounded-lg p-2 mt-4" @click="router.push('/bluetooth-setup')">Go To Bluetooth</span>
                <span class="btn bg-blue-500 rounded-lg p-2 mt-4" @click="router.push('/wifi-setup')">Go To WiFi</span>
            </div>
        </ion-content>
    </ion-page>
</template>

<style scoped></style>
