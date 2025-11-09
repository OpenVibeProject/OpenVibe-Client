<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue';
import { IonContent, IonPage } from '@ionic/vue';
import { WifiWizard2 } from '@awesome-cordova-plugins/wifi-wizard-2';
import MaterialSymbolsWifiSharp from '~icons/material-symbols/wifi-sharp';
import { useBleStore } from '@/stores/ble';
import { useDebugStore } from '@/stores/debug';
import { useWebSocketStore } from '@/stores/websocket';
import MaterialSymbolsLockOutline from '~icons/material-symbols/lock-outline';
import WiFiCredentialsModal from '@/components/WiFiCredentialsModal.vue';
import router from '@/router'
import { LogLevel } from '@/types/LogLevel';
import { WiFiNetwork } from '@/types/WiFiNetwork';
import { WiFiCredentialsRequest } from '@/types/WiFiCredentialsRequest';
import { WiFiCredentials } from '@/types/WiFiCredentials';
import { RequestEnum } from '@/types/RequestEnum';

const bleStore = useBleStore();
const debugStore = useDebugStore();
const wsStore = useWebSocketStore();
const networks = ref<WiFiNetwork[]>([

]);
const isScanning = ref(false);
const showPasswordModal = ref(false);
const selectedNetwork = ref<WiFiNetwork | null>(null);
const isCustomNetwork = ref(false);
let unsub: (() => void) | null = null;
let scanInterval: number | undefined;

const scanNetworks = async () =>
{
  try
  {
    isScanning.value = true;
    const scanResults = await WifiWizard2.scan();
    networks.value = scanResults;
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

const connectToNetwork = async (data: WiFiCredentials) =>
{
  try
  {
    if (bleStore.deviceId)
    {
      const connectionRequest: WiFiCredentialsRequest = {
        requestType: RequestEnum.WIFI_CREDENTIALS,
        ssid: data.ssid,
        password: data.password
      }
      await bleStore.writeCharacteristic(JSON.stringify(connectionRequest));
      alert('WiFi credentials sent to device!');
    } else
    {
      alert('No BLE device connected.');
    }

  } catch (error)
  {
    alert('Failed to send WiFi credentials: ' + error);
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

const onNotification = async (payload: any) =>
{
  debugStore.addLog(LogLevel.DEBUG, `BLE notification received: ${String(payload.raw)}`);
  if (payload.parsed)
  {
    debugStore.addLog(LogLevel.INFO, `BLE StatusResponse: ${JSON.stringify(payload.parsed)}`);
    if (payload.parsed && typeof payload.parsed === 'object' && 'wifiConnected' in payload.parsed && payload.parsed.wifiConnected)
    {
      if (payload.parsed.ip)
      {
        debugStore.addLog(LogLevel.INFO, `Device IP received: ${payload.parsed.ip}`);
        wsStore.connect(payload.parsed.ip);
        await bleStore.disconnect();
        router.push('/');
      } else
      {
        router.push('/');
      }
    }
  }
};

onMounted(async () =>
{
  await scanNetworks();
  unsub = bleStore.on('notification', onNotification);
  scanInterval = setInterval(scanNetworks, 10000);
});

onUnmounted(() =>
{
  if (unsub) unsub();
  if (scanInterval) clearInterval(scanInterval);
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

        <div class="rounded-lg shadow-lg p-2 h-[55vh]">
          <div v-if="networks.length > 0" class="h-[55vh] overflow-y-auto">
            <div v-for="network in networks" :key="network.SSID" @click="selectNetwork(network)"
              class="p-3 bg-zinc-800 cursor-pointer networks-container">
              <div class="flex justify-between items-center text-xl p-2">
                <div class="w-full flex items-center justify-between">
                  <div class="flex flex-row gap-3 items-center">
                    <MaterialSymbolsWifiSharp class="text-blue-500 text-2xl" />
                    <p>{{ network.SSID === '' ? 'Unknown' : network.SSID }}</p>
                  </div>
                  <div class="text-xs text-gray-400">
                    <MaterialSymbolsLockOutline class="text-lg" v-if="network.capabilities?.includes('WPA')" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-row w-60 mx-auto justify-center gap-4 text-lg mt-10">
        <span @click="showCustomModal" class="underline">Add custom</span>
        •
        <span class="underline" @click="router.push('/')">Skip for now</span>
      </div>
      <WiFiCredentialsModal :is-open="showPasswordModal" :network="selectedNetwork" :is-custom="isCustomNetwork"
        @dismiss="handleModalDismiss" @connect="connectToNetwork" />
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
