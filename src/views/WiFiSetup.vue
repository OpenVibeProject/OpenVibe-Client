<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { IonContent, IonPage, IonButton, IonInput, IonItem, IonModal } from '@ionic/vue';
import { WifiWizard2 } from '@awesome-cordova-plugins/wifi-wizard-2';
import MaterialSymbolsWifiSharp from '~icons/material-symbols/wifi-sharp';
import { useBleStore } from '@/stores/ble';
import { BLEEnum } from '@/types/BLEEnum';
import { BleClient } from '@capacitor-community/bluetooth-le';

interface WiFiNetwork
{
  SSID: string;
  level: number;
  capabilities: string;
}

const networks = ref<WiFiNetwork[]>([
  // add mock kwifis
  { SSID: 'Home_Network', level: -45, capabilities: 'WPA2' },
  { SSID: 'Guest_WiFi', level: -70, capabilities: 'WPA' },
  { SSID: 'Open_Network', level: -80, capabilities: '' },
  // more
  { SSID: 'Coffee_Shop_WiFi', level: -60, capabilities: 'WPA2' },
  { SSID: 'Library_WiFi', level: -75, capabilities: 'WPA' },
  { SSID: 'Airport_Free_WiFi', level: -85, capabilities: '' },
]);
const isScanning = ref(false);
const showPasswordModal = ref(false);
const selectedNetwork = ref<WiFiNetwork | null>(null);
const password = ref('');

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
    connectToNetwork();
  }
};

const bleStore = useBleStore();

const connectToNetwork = async () =>
{
  try
  {
    if (bleStore.deviceId && selectedNetwork.value)
    {
      const payload = JSON.stringify({ ssid: selectedNetwork.value.SSID, password: password.value });
      const encoder = new TextEncoder();
      const value = encoder.encode(payload);
      await BleClient.write(
        bleStore.deviceId,
        BLEEnum.SERVICE_UUID,
        BLEEnum.CHARACTERISTIC_UUID,
        new DataView(value.buffer)
      );
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
  password.value = '';
};

onMounted(async () =>
{
  await scanNetworks();
})
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding-top">
      <div class="flex flex-col w-5/6 mx-auto gap-8 mt-[15vh]">
        <div class="text-center">
          <h1 class="text-3xl font-bold mb-5">We're almost there</h1>
          <p class="text-lg text-gray-400">Let’s connect your vibrator to the WI-FI</p>
        </div>

        <div class="rounded-lg shadow-lg p-4">
          <div v-if="networks.length > 0" class="max-h-[60vh] overflow-y-auto space-y-2">
            <div v-for="network in networks" :key="network.SSID" @click="selectNetwork(network)"
              class="p-3 bg-zinc-800 rounded cursor-pointer hover:bg-zinc-700">
              <div class="flex justify-between items-center">
                <div>
                  <div class="font-medium flex flex-row gap-2">
                    <MaterialSymbolsWifiSharp />{{ network.SSID }}
                  </div>
                  <div class="text-xs text-gray-400">
                    {{ network.capabilities?.includes('WPA') ? '🔒 Secured' : '🔓 Open' }} • Signal: {{ network.level }}
                    dBm
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ion-modal :is-open="showPasswordModal" @did-dismiss="showPasswordModal = false">
        <div class="p-6">
          <h2 class="text-xl font-bold mb-4">Enter Password</h2>
          <p class="mb-4">Network: {{ selectedNetwork?.SSID }}</p>
          <ion-item>
            <ion-input v-model="password" type="password" placeholder="WiFi Password"></ion-input>
          </ion-item>
          <div class="flex gap-4 mt-6">
            <ion-button @click="showPasswordModal = false" fill="outline" expand="block">
              Cancel
            </ion-button>
            <ion-button @click="connectToNetwork" expand="block">
              Connect
            </ion-button>
          </div>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<style scoped></style>
