<script setup lang="ts">
import { ref } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue';
import LiquidGauge from '../components/LiquidGauge.vue';
import router from '../router';

const percentage = ref(100);

setInterval(() => {
    percentage.value = percentage.value - 1;
}, 100);

</script>

<template>
    <ion-page>
        <ion-content>
            <div class="flex flex-col justify-center items-center h-full">
                <LiquidGauge :percentage="percentage" />
                <span class="btn bg-blue-500 rounded-lg p-2 mt-4" @click="router.push('/bluetooth-setup')">Go To Bluetooth</span>
                <span class="btn bg-blue-500 rounded-lg p-2 mt-4" @click="router.push('/wifi-setup')">Go To WiFi</span>
            </div>
        </ion-content>
    </ion-page>
</template>

<style scoped></style>
