<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue';
import { IonContent, IonPage } from '@ionic/vue';
import { WifiWizard2 } from '@awesome-cordova-plugins/wifi-wizard-2';
import MaterialSymbolsWifiSharp from '~icons/material-symbols/wifi-sharp';
import { useBleStore } from '@/stores/ble';
import { useDebugStore } from '@/stores/debug';
import { useAppStore } from '@/stores/app';
import { WiFiPermissionStatus } from '@/types/WiFiPermissionStatus';
import MaterialSymbolsLockOutline from '~icons/material-symbols/lock-outline';
import WiFiCredentialsModal from '@/components/WiFiCredentialsModal.vue';
import router from '@/router'
import { LogLevel } from '@/types/LogLevel';
import { WiFiNetwork } from '@/types/WiFiNetwork';
import { WiFiCredentialsRequest } from '@/types/WiFiCredentialsRequest';
import { WiFiCredentials } from '@/types/WiFiCredentials';
import { RequestEnum } from '@/types/RequestEnum';
import { BLEEmitterEnum } from '@/types/BLEEmitterEnum';

const bleStore = useBleStore();
const debugStore = useDebugStore();
const appStore = useAppStore();
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
    try {
      const requested = (appStore as any).wifiPermissionRequested ?? false;
      const status = (appStore as any).wifiPermissionStatus ?? WiFiPermissionStatus.UNKNOWN;

      if (!requested) {
        const permResult: any = await WifiWizard2.requestPermission();
        debugStore.addLog(LogLevel.DEBUG, `WiFi permission request result: ${String(permResult)}`);

        const denied = permResult === false || (typeof permResult === 'string' && /denied/i.test(permResult));
        if (denied) {
          debugStore.addLog(LogLevel.ERROR, 'WiFi permission denied by user');
          appStore.setWiFiPermissionStatus(WiFiPermissionStatus.DENIED);
          alert('Location permission is required to scan Wi‑Fi networks. Please enable it in Settings.');
          isScanning.value = false;
          return;
        }

        appStore.setWiFiPermissionStatus(WiFiPermissionStatus.GRANTED);
      } else if (status === 'denied' || status === 'error') {
        debugStore.addLog(LogLevel.WARN, 'Previously denied WiFi permission; not re-requesting');
        alert('Wi‑Fi scanning requires Location permission. Please enable it in Settings if you want networks scanned.');
        isScanning.value = false;
        return;
      }
    } catch (permErr) {
      debugStore.addLog(LogLevel.ERROR, `WiFi permission request failed: ${String(permErr)}`);
      appStore.setWiFiPermissionStatus(WiFiPermissionStatus.ERROR);
      alert('Location permission request failed. Please enable Location permission in app settings.');
      isScanning.value = false;
      return;
    }

    const scanResults = await WifiWizard2.scan();
    networks.value = scanResults ?? [];

    if (!networks.value || networks.value.length === 0) {
      debugStore.addLog(LogLevel.WARN, 'WiFi scan returned no networks');
    }
  } catch (err) {
    debugStore.addLog(LogLevel.ERROR, `WiFi scan failed: ${String(err)}`);
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
      await bleStore.send(JSON.stringify(connectionRequest));
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
    router.push('/');
  }
};

onMounted(async () =>
{
  await scanNetworks();
  unsub = bleStore.emitter.on(BLEEmitterEnum.NOTIFICATION, onNotification);
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
