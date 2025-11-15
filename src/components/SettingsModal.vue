<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { IonModal, IonToggle, IonSelect, IonSelectOption } from '@ionic/vue';
import { TransportType } from '@/types/TransportEnum';
import { RequestEnum } from '@/types/RequestEnum';
import { SwitchTransportRequest } from '@/types/SwitchTransportRequest';
import { useTransportStore } from '@/stores/transport';
import { useBleStore } from '@/stores/ble';
import { useWebSocketStore } from '@/stores/websocket';
import { useVibratorStore } from '@/stores/vibrator';
import { useDebugStore } from '@/stores/debug';
import { LogLevel } from '@/types/LogLevel';

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
const bleStore = useBleStore();
const wsStore = useWebSocketStore();
const debugStore = useDebugStore();

const preferredTransport = ref(TransportType.BLE);
const bleEnabled = ref(true);
const wifiEnabled = ref(true);
const remoteEnabled = ref(true);
const isLoading = ref(false);

const sendSwitchTransportRequest = async (transport: TransportType) => {
  if (isLoading.value) return;
  
  isLoading.value = true;
  debugStore.addLog(LogLevel.INFO, `Switching to transport: ${transport}`);
  
  try {
    const request: SwitchTransportRequest = {
      requestType: RequestEnum.SWITCH_TRANSPORT,
      transport
    };
    
    // Send request on current transport
    if (transportStore.currentTransport === TransportType.BLE && bleStore.isConnected) {
      await bleStore.writeCharacteristic(JSON.stringify(request));
    } else if ((transportStore.currentTransport === TransportType.WIFI || transportStore.currentTransport === TransportType.REMOTE) && wsStore.isConnected) {
      wsStore.send(request);
    }
    
    // Wait for response and handle transport switch
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Switch timeout')), 10000);
      
      const handleResponse = (data: any) => {
        if (data.parsed?.requestType === RequestEnum.SWITCH_TRANSPORT) {
          clearTimeout(timeout);
          transportStore.setCurrentTransport(transport);
          debugStore.addLog(LogLevel.INFO, `Transport switched to: ${transport}`);
          resolve(data);
        }
      };
      
      if (transportStore.currentTransport === TransportType.BLE) {
        bleStore.on('notification', handleResponse);
      } else {
        wsStore.on('message', handleResponse);
      }
    });
    
  } catch (error) {
    debugStore.addLog(LogLevel.ERROR, `Transport switch failed: ${error}`);
  } finally {
    isLoading.value = false;
  }
};

watch(preferredTransport, (newTransport) => {
  if (newTransport !== transportStore.currentTransport) {
    sendSwitchTransportRequest(newTransport);
  }
});

const deviceInfo = computed(() => ({
    currentTransport: vibratorStore.status?.transport || 'None',
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
                    <ion-select v-model="preferredTransport" interface="popover" class="transport-select" :disabled="isLoading">
                        <ion-select-option :value="TransportType.BLE">Bluetooth</ion-select-option>
                        <ion-select-option :value="TransportType.WIFI">Wi-Fi</ion-select-option>
                        <ion-select-option :value="TransportType.REMOTE">Remote</ion-select-option>
                    </ion-select>
                    <div v-if="isLoading" class="text-xs text-gray-400 mt-2">Switching transport...</div>
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