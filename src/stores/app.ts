import { defineStore } from 'pinia';

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
    setLastConnectedDevice(deviceId: string | null) {
      this.lastConnectedDeviceId = deviceId;
      this.isFirstSetup = false;
      this.saveSettings();
    },
    saveSettings() {
      const settings = {
        isFirstSetup: this.isFirstSetup,
        lastConnectedDeviceId: this.lastConnectedDeviceId
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
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    }
  }
});
