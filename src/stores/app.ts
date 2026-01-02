import { defineStore } from 'pinia';
import { WiFiPermissionStatus } from '@/types/WiFiPermissionStatus';

export const useAppStore = defineStore('app', {
  state: () => ({
    isFirstSetup: true as boolean,
    lastConnectedDeviceId: null as string | null
  }),
  getters: {
    hasLastConnectedDevice(state) {
      return !!state.lastConnectedDeviceId;
    }
  },
  actions: {
    setWiFiPermissionStatus(status: WiFiPermissionStatus) {
      (this as any).wifiPermissionStatus = status;
      (this as any).wifiPermissionRequested = true;
      this.saveSettings();
    },
    setLastConnectedDevice(deviceId: string | null) {
      this.lastConnectedDeviceId = deviceId;
      this.isFirstSetup = false;
      this.saveSettings();
    },
    saveSettings() {
      const settings = {
        isFirstSetup: this.isFirstSetup,
        lastConnectedDeviceId: this.lastConnectedDeviceId,
        wifiPermissionRequested: (this as any).wifiPermissionRequested ?? false,
        wifiPermissionStatus: (this as any).wifiPermissionStatus ?? WiFiPermissionStatus.UNKNOWN
      };
      try {
        localStorage.setItem('openvibe-settings', JSON.stringify(settings));
      } catch (e) {
        console.warn('Failed to save settings:', e);
      }
    },
    loadSettings() {
      try {
        const saved = localStorage.getItem('openvibe-settings');
        if (saved) {
          const settings = JSON.parse(saved);
          this.isFirstSetup = settings.isFirstSetup ?? true;
          this.lastConnectedDeviceId = settings.lastConnectedDeviceId ?? null;
          (this as any).wifiPermissionRequested = settings.wifiPermissionRequested ?? false;
          (this as any).wifiPermissionStatus = settings.wifiPermissionStatus ?? WiFiPermissionStatus.UNKNOWN;
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    }
  }
});

// augment runtime state defaults (Pinia doesn't require declaring all fields in state)
declare module 'pinia' {
  interface PiniaCustomStateProperties {
    wifiPermissionRequested?: boolean;
    wifiPermissionStatus?: WiFiPermissionStatus;
  }
}
