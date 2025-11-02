<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue';
import { IonContent, IonPage } from '@ionic/vue';
import { WifiWizard2 } from '@awesome-cordova-plugins/wifi-wizard-2';
import MaterialSymbolsWifiSharp from '~icons/material-symbols/wifi-sharp';
import { useBleStore } from '@/stores/ble';
import { useDebugStore } from '@/stores/debug';
import MaterialSymbolsLockOutline from '~icons/material-symbols/lock-outline';
import WiFiCredentialsModal from '@/components/WiFiCredentialsModal.vue';
import router from '@/router'
import { LogLevel } from '@/types/LogLevel';

interface WiFiNetwork
{
  SSID: string;
  level: number;
  capabilities: string;
}

const bleStore = useBleStore();
const debugStore = useDebugStore();
const networks = ref<WiFiNetwork[]>([]);
const isScanning = ref(false);
const showPasswordModal = ref(false);
const selectedNetwork = ref<WiFiNetwork | null>(null);
const isCustomNetwork = ref(false);
let unsub: (() => void) | null = null;

const scanNetworks = async () =>
{
  try
  {
    isScanning.value = true;
    const scanResults = await WifiWizard2.scan();
    networks.value = scanResults;
  } catch (error)
  {
    console.error('WiFi scan error:', error);
  } finally
  {
    isScanning.value = false;
  }
};

const selectNetwork = (network: WiFiNetwork) =>
{
  selectedNetwork.value = network;
  const isSecured = network.capabilities && network.capabilities.includes('WPA');
  if (isSecured)
  {
    showPasswordModal.value = true;
  } else
  {
    connectToNetwork({ ssid: network.SSID, password: '' });
  }
};

const connectToNetwork = async (data: { ssid: string; password: string }) =>
{
  try
  {
    if (bleStore.deviceId)
    {
      const payload = JSON.stringify({ ssid: data.ssid, password: data.password });
      await bleStore.writeCharacteristic(payload);
      alert('WiFi credentials sent to device!');
    } else
    {
      alert('No BLE device connected.');
    }

  } catch (error)
  {
    alert('Failed to send WiFi credentials: ' + error);
    console.error('Connection error:', error);
  }
  showPasswordModal.value = false;
};

const handleModalDismiss = () =>
{
  showPasswordModal.value = false;
  isCustomNetwork.value = false;
};

const showCustomModal = () =>
{
  selectedNetwork.value = null;
  isCustomNetwork.value = true;
  showPasswordModal.value = true;
};

const onNotification = (payload: any) => {
  debugStore.addLog(LogLevel.DEBUG, `BLE notification received: ${String(payload.raw)}`);
  if (payload.parsed) {
    debugStore.addLog(LogLevel.INFO, `BLE StatusResponse: ${JSON.stringify(payload.parsed)}`);
    if (payload.parsed && typeof payload.parsed === 'object' && 'wifiConnected' in payload.parsed && payload.parsed.wifiConnected) {
      router.push('/');
    }
  }
};

onMounted(async () => {
  await scanNetworks();
  unsub = bleStore.on('notification', onNotification);
});

onUnmounted(() => {
  if (unsub) unsub();
});
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding-top">
      <div class="flex flex-col w-5/6 mx-auto gap-8 mt-[15vh]">
        <div class="text-center">
          <h1 class="text-3xl font-bold mb-5">We're almost there</h1>
          <p class="text-lg text-gray-400">Let’s connect your vibrator to the WI-FI</p>
        </div>

        <div class="rounded-lg shadow-lg p-2">
          <div v-if="networks.length > 0" class="max-h-[55vh] overflow-y-auto">
            <div v-for="network in networks" :key="network.SSID" @click="selectNetwork(network)"
              class="p-3 bg-zinc-800 cursor-pointer networks-container hover:bg-zinc-700">
              <div class="flex justify-between items-center text-xl p-2">
                <div class="w-full flex items-center justify-between">
                  <div class="flex flex-row gap-3 items-center">
                    <MaterialSymbolsWifiSharp class="text-blue-500 text-2xl" />
                    <p>{{ network.SSID === '' ? 'Unknown' : network.SSID  }}</p>
                  </div>
                  <div class="text-xs text-gray-400">
                    <MaterialSymbolsLockOutline class="text-lg" v-if="network.capabilities?.includes('WPA')" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-row w-60 mx-auto justify-center gap-4 text-lg">
          <span @click="showCustomModal" class="cursor-pointer hover:text-blue-400">Add custom</span>
          •
          <span class="cursor-pointer hover:text-blue-400" @click="router.push('/')">Skip for now</span>
        </div>
      </div>

      <WiFiCredentialsModal 
        :is-open="showPasswordModal" 
        :network="selectedNetwork" 
        :is-custom="isCustomNetwork"
        @dismiss="handleModalDismiss" 
        @connect="connectToNetwork" 
      />
    </ion-content>
  </ion-page>
</template>

<style scoped>
.networks-container {
  border: #626262 1px solid;
  border-bottom: none;
}

.networks-container:first-child {
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
}

.networks-container:last-child {
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  border: #626262 1px solid;
}
</style>
