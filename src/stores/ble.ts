import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ScanResult } from '@capacitor-community/bluetooth-le';

export const useBleStore = defineStore('ble', () => {
  // Store the connected deviceId and ScanResult
  const deviceId = ref<string | null>(null);
  const device = ref<ScanResult | null>(null);
  // Optionally, store connection state
  const isConnected = ref(false);

  function setConnection(id: string, scanResult: ScanResult) {
    deviceId.value = id;
    device.value = scanResult;
    isConnected.value = true;
  }

  function clearConnection() {
    deviceId.value = null;
    device.value = null;
    isConnected.value = false;
  }

  return { deviceId, device, isConnected, setConnection, clearConnection };
});
