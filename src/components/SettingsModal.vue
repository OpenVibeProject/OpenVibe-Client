<script setup lang="ts">
import { ref, computed } from 'vue';
import { IonModal, IonToggle, IonSelect, IonSelectOption } from '@ionic/vue';
import { TransportType } from '@/types/TransportEnum';
import { useTransportStore } from '@/stores/transport';
import { useBleStore } from '@/stores/ble';
import { useWebSocketStore } from '@/stores/websocket';
import { useVibratorStore } from '@/stores/vibrator';

interface Props
{
    isOpen: boolean;
}

interface Emits
{
    (e: 'dismiss'): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const vibratorStore = useVibratorStore();
const transportStore = useTransportStore();

const preferredTransport = ref(TransportType.BLE);
const bleEnabled = ref(true);
const wifiEnabled = ref(true);
const remoteEnabled = ref(true);

const deviceInfo = computed(() => ({
    currentTransport: transportStore.currentTransport || 'None',
    macAddress: vibratorStore.status?.macAddress || 'N/A',
    ipAddress: vibratorStore.status?.ipAddress || 'N/A',
    deviceId: vibratorStore.status?.deviceId || 'N/A'
}));

const handleDismiss = () =>
{
    emit('dismiss');
};
</script>

<template>
    <ion-modal :is-open="isOpen" @did-dismiss="handleDismiss">
        <div class="p-4 flex flex-col items-center text-center rounded-2xl modal-content">
            <h2 class="text-2xl font-bold mb-4">Settings</h2>

            <div class="w-full space-y-6">
                <!-- Device Information -->
                <div class="text-left">
                    <h3 class="text-md font-medium mb-3 text-gray-300">Device Information</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Transport:</span>
                            <span>{{ deviceInfo.currentTransport }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">MAC Address:</span>
                            <span class="font-mono text-xs">{{ deviceInfo.macAddress }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">IP Address:</span>
                            <span class="font-mono text-xs">{{ deviceInfo.ipAddress }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Device ID:</span>
                            <span class="font-mono text-xs truncate max-w-32">{{ deviceInfo.deviceId }}</span>
                        </div>
                    </div>
                </div>

                <!-- Preferred Transport -->
                <div class="text-left">
                    <h3 class="text-md font-medium mb-3 text-gray-300">Preferred Transport</h3>
                    <ion-select v-model="preferredTransport" interface="popover" class="transport-select">
                        <ion-select-option :value="TransportType.BLE">Bluetooth</ion-select-option>
                        <ion-select-option :value="TransportType.WIFI">Wi-Fi</ion-select-option>
                        <ion-select-option :value="TransportType.REMOTE">Remote</ion-select-option>
                    </ion-select>
                </div>

                <!-- Transport Toggles -->
                <div class="text-left">
                    <h3 class="text-md font-medium mb-3 text-gray-300">Available Transports</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span>Bluetooth</span>
                            <ion-toggle v-model="bleEnabled" color="primary"></ion-toggle>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>Wi-Fi</span>
                            <ion-toggle v-model="wifiEnabled" color="primary"></ion-toggle>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>Remote</span>
                            <ion-toggle v-model="remoteEnabled" color="primary"></ion-toggle>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </ion-modal>
</template>

<style scoped>
ion-modal {
    --width: 340px;
    --height: auto;
    --background: #1a1a1a;
    --backdrop-opacity: 0.8;
    --border-radius: 16px;
}

.modal-content {
    border: #626262 2px solid;
}

.transport-select {
    --background: #2a2a2a;
    --color: white;
    --border-radius: 8px;
    --padding-start: 12px;
    --padding-end: 12px;
}
</style>