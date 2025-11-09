import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const isFirstSetup = ref(true);
  const theme = ref<'light' | 'dark'>('dark');
  const language = ref('en');
  const lastConnectedDeviceId = ref<string | null>(null);

  function completeFirstSetup() {
    isFirstSetup.value = false;
    saveSettings();
  }

  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme;
    saveSettings();
  }

  function setLanguage(lang: string) {
    language.value = lang;
    saveSettings();
  }

  function setLastConnectedDevice(deviceId: string | null) {
    lastConnectedDeviceId.value = deviceId;
    saveSettings();
  }

  function saveSettings() {
    const settings = {
      isFirstSetup: isFirstSetup.value,
      theme: theme.value,
      language: language.value,
      lastConnectedDeviceId: lastConnectedDeviceId.value
    };
    localStorage.setItem('openvibe-settings', JSON.stringify(settings));
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem('openvibe-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        isFirstSetup.value = settings.isFirstSetup ?? true;
        theme.value = settings.theme ?? 'dark';
        language.value = settings.language ?? 'en';
        lastConnectedDeviceId.value = settings.lastConnectedDeviceId ?? null;
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }

  loadSettings();

  return {
    isFirstSetup,
    theme,
    language,
    lastConnectedDeviceId,
    completeFirstSetup,
    setTheme,
    setLanguage,
    setLastConnectedDevice,
    saveSettings,
    loadSettings
  };
});