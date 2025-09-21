<script setup lang="ts">
import { ref } from 'vue';
import { IonContent, IonPage, IonButton, IonInput, IonItem, IonModal } from '@ionic/vue';
import { WifiWizard2 } from '@awesome-cordova-plugins/wifi-wizard-2';

interface WiFiNetwork {
  SSID: string;
  level: number;
  capabilities: string;
}

const networks = ref<WiFiNetwork[]>([]);
const isScanning = ref(false);
const showPasswordModal = ref(false);
const selectedNetwork = ref<WiFiNetwork | null>(null);
const password = ref('');

const scanNetworks = async () => {
  try {
    isScanning.value = true;
    const scanResults = await WifiWizard2.scan();
    networks.value = scanResults;
  } catch (error) {
    console.error('WiFi scan error:', error);
  } finally {
    isScanning.value = false;
  }
};

const selectNetwork = (network: WiFiNetwork) => {
  selectedNetwork.value = network;
  const isSecured = network.capabilities && network.capabilities.includes('WPA');
  if (isSecured) {
    showPasswordModal.value = true;
  } else {
    connectToNetwork();
  }
};

const connectToNetwork = async () => {
  try {
    await WifiWizard2.connect(selectedNetwork.value!.SSID, true, password.value);
    console.log(`Connected to ${selectedNetwork.value?.SSID}`);
  } catch (error) {
    console.error('Connection error:', error);
  }
  showPasswordModal.value = false;
  password.value = '';
};
</script>

<template>
    <ion-page>
        <ion-content :fullscreen="true" class="ion-padding-top">
            <div class="flex flex-col w-5/6 mx-auto gap-8" style="padding-top: env(safe-area-inset-top, 60px);">
                <div class="text-center">
                    <h1 class="text-3xl font-bold mb-5">WiFi Setup</h1>
                    <p class="text-lg text-gray-400">Select a network to connect</p>
                </div>
                
                <ion-button @click="scanNetworks" :disabled="isScanning" expand="block">
                    {{ isScanning ? 'Scanning...' : 'Scan Networks' }}
                </ion-button>
                
                <div class="rounded-lg shadow-lg p-4">
                    <div v-if="networks.length > 0" class="max-h-[60vh] overflow-y-auto space-y-2">
                        <div 
                            v-for="network in networks" 
                            :key="network.SSID"
                            @click="selectNetwork(network)"
                            class="p-3 bg-zinc-800 rounded cursor-pointer hover:bg-zinc-700"
                        >
                            <div class="flex justify-between items-center">
                                <div>
                                    <div class="font-medium">{{ network.SSID }}</div>
                                    <div class="text-xs text-gray-400">
                                        {{ network.capabilities?.includes('WPA') ? '🔒 Secured' : '🔓 Open' }} • Signal: {{ network.level }} dBm
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
                        <ion-input 
                            v-model="password" 
                            type="password" 
                            placeholder="WiFi Password"
                        ></ion-input>
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
