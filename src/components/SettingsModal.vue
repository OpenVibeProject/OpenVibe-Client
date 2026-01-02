<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { IonModal, IonToggle, IonSelect, IonSelectOption } from "@ionic/vue";
import { TransportTypeEnum } from "@/types/TransportTypeEnum";
import { ModalEnum } from "@/types/ModalEnum";
import { useVibratorStore } from "@/stores/vibrator";
import { useServerStore } from "@/stores/server";
import { useModalStore } from "@/stores/modal";
import { useDebugStore } from "@/stores/debug";
import { LogLevel } from "@/types/LogLevel";
import IconoirCopy from "~icons/iconoir/copy";
import ServerModal from "@/components/ServerModal.vue";
import { RouterLink } from "vue-router";

interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: "dismiss"): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const vibratorStore = useVibratorStore();
const serverStore = useServerStore();
const modalStore = useModalStore();
const debugStore = useDebugStore();

const preferredTransport = ref(TransportTypeEnum.BLE);
const bleEnabled = ref(true);
const wifiEnabled = ref(true);
const remoteEnabled = ref(true);
const selectedServer = ref("");
const isLoading = ref(false);

const sendSwitchTransportRequest = async (transport: TransportTypeEnum) => {
  if (isLoading.value) return;

  isLoading.value = true;
  try {
    const serverAddress =
      transport === TransportTypeEnum.REMOTE ? selectedServer.value : undefined;
    vibratorStore.switchTransport(transport, serverAddress);
  } catch (error) {
    debugStore.addLog(LogLevel.ERROR, `Transport switch failed: ${error}`);
  } finally {
    isLoading.value = false;
  }
};

const deviceInfo = computed(() => ({
  currentTransport: vibratorStore.status?.transport || "None",
  macAddress: vibratorStore.status?.macAddress || "N/A",
  ipAddress: vibratorStore.status?.ipAddress || "N/A",
  deviceId: vibratorStore.status?.deviceId || "N/A",
}));

const handleDismiss = () => {
  emit("dismiss");
  modalStore.close(ModalEnum.SETTINGS);
};

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    debugStore.addLog(LogLevel.ERROR, `Failed to copy ${label}: ${error}`);
  }
};

const handleAddServer = (data: { name: string; url: string }) => {
  modalStore.close(ModalEnum.SERVER);
  modalStore.open(ModalEnum.SETTINGS);
  serverStore.addServer(data);
  selectedServer.value = data.url;
};

const handleAddCustomServerClick = () => {
  modalStore.close(ModalEnum.SETTINGS);
  modalStore.open(ModalEnum.SERVER);
};

watch(preferredTransport, (newTransport) =>
{
    if (newTransport !== vibratorStore.status?.transport)
    {
        sendSwitchTransportRequest(newTransport);
    }
});

onMounted(() => {
  serverStore.loadServers();
  if (serverStore.servers.length > 0) {
    selectedServer.value = serverStore.servers[0].url;
  }
});
</script>

<template>
  <ion-modal :is-open="isOpen" @did-dismiss="handleDismiss">
    <div
      class="p-4 flex flex-col items-center text-center rounded-2xl modal-content"
    >
      <h2 class="text-2xl font-bold mb-4">Settings</h2>

      <div class="w-full space-y-6">
        <div class="text-left">
          <h3 class="text-md font-medium mb-3 text-gray-300">
            Device Information
          </h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-400">Transport:</span>
              <span>{{ deviceInfo.currentTransport }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">MAC Address:</span>
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs">{{
                  deviceInfo.macAddress
                }}</span>
                <button
                  @click="copyToClipboard(deviceInfo.macAddress, 'MAC Address')"
                  class="copy-btn"
                  title="Copy MAC Address"
                >
                  <IconoirCopy />
                </button>
              </div>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">IP Address:</span>
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs">{{
                  deviceInfo.ipAddress
                }}</span>
                <button
                  @click="copyToClipboard(deviceInfo.ipAddress, 'IP Address')"
                  class="copy-btn"
                  title="Copy IP Address"
                >
                  <IconoirCopy />
                </button>
              </div>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Device ID:</span>
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs truncate max-w-32">{{
                  deviceInfo.deviceId
                }}</span>
                <button
                  @click="copyToClipboard(deviceInfo.deviceId, 'Device ID')"
                  class="copy-btn"
                  title="Copy Device ID"
                >
                  <IconoirCopy />
                </button>
              </div>
            </div>
          </div>

          <p class="text-xs text-gray-400 mt-5">
            Share your Device ID to allow others to control your device
          </p>
        </div>

        <div class="text-left">
          <h3 class="text-md font-medium mb-3 text-gray-300">
            Preferred Transport
          </h3>
          <ion-select
            v-model="preferredTransport"
            interface="popover"
            class="transport-select"
            :disabled="isLoading"
          >
            <ion-select-option :value="TransportTypeEnum.BLE"
              >Bluetooth</ion-select-option
            >
            <ion-select-option :value="TransportTypeEnum.WIFI"
              >Wi-Fi</ion-select-option
            >
            <ion-select-option :value="TransportTypeEnum.REMOTE"
              >Remote</ion-select-option
            >
          </ion-select>
          <div v-if="isLoading" class="text-xs text-gray-400 mt-2">
            Switching transport...
          </div>
        </div>

        <div
          v-if="preferredTransport === TransportTypeEnum.REMOTE"
          class="text-left"
        >
          <h3 class="text-md font-medium mb-3 text-gray-300">Remote Server</h3>
          <ion-select
            v-model="selectedServer"
            interface="popover"
            class="transport-select"
          >
            <ion-select-option
              v-for="server in serverStore.servers"
              :key="server.url"
              :value="server.url"
            >
              {{ server.name }}
            </ion-select-option>
          </ion-select>
          <button
            @click="handleAddCustomServerClick"
            class="mt-2 text-sm text-green-500 hover:text-green-400"
          >
            + Add Custom Server
          </button>
        </div>

        <div class="text-left">
          <h3 class="text-md font-medium mb-3 text-gray-300">
            Allowed Transports
          </h3>
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
          <p class="text-xs text-gray-400 mt-4">
            By enabling remote transport, you allow others to connect to your
            device over the internet
          </p>
        </div>
        <RouterLink to="remote-setup" @click="handleDismiss">
          <p class="underline">Connect to a remote device</p>
        </RouterLink>
      </div>
    </div>
  </ion-modal>

  <ServerModal
    :is-open="modalStore.isOpen(ModalEnum.SERVER)"
    @dismiss="() => modalStore.close(ModalEnum.SERVER)"
    @add="handleAddServer"
  />
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

.copy-btn {
  color: #9ca3af;
  cursor: pointer;
  padding: 2px;
  transition: color 0.2s;
}

.copy-btn:hover {
  color: #ffffff;
}

.copy-btn:active {
  transform: scale(0.95);
}
</style>
